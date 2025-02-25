import mongoose from "mongoose";

import { solveWeibull } from "../../../shared/utils/weibull";
import { uspsaClassifiers } from "../dataUtil/classifiersData";
import {
  allDivShortNames,
  classifierDivisionArrayForHFURecHHFs,
  divisionsForRecHHFAdapter,
  hfuDivisionCompatabilityMap,
  PROD_15_EFFECTIVE_TS,
} from "../dataUtil/divisions";
import { curHHFForDivisionClassifier } from "../dataUtil/hhf";
import { Percent, PositiveOrMinus1 } from "../dataUtil/numbers";

import { minorHFScoresAdapter, Score, Scores } from "./scores";

interface ScoreWithPercentile extends Score {
  percentile: number;
}

const runsForRecs = async ({ division, number }): Promise<ScoreWithPercentile[]> =>
  (
    await Scores.find({
      classifier: number,
      division: { $in: divisionsForRecHHFAdapter(division) },
      hf: { $gt: 0 },
      bad: { $ne: true },
    })
      .sort({ hf: -1 })
      .limit(0)
      .lean()
  ).map((run, index, allRuns) => ({
    ...run,
    percentile: PositiveOrMinus1(Percent(index, allRuns.length)),
  }));

const runsForRecsMultiByClassifierDivision = async classifiers => {
  const runs = await Scores.find({
    bad: { $ne: true },
    classifierDivision: {
      $in: classifierDivisionArrayForHFURecHHFs(classifiers),
    },
    hf: { $gt: 0 },
  })
    .select({ hf: true, minorHF: true, _id: false, classifierDivision: true })
    .sort({ hf: -1 })
    .limit(0)
    .lean();

  const byCD = runs.reduce((acc, cur) => {
    const curBucket = acc[cur.classifierDivision] ?? [];
    curBucket.push(cur);
    acc[cur.classifierDivision] = curBucket;

    // same as above but for single HFU division, if there is any for cur.division
    const [classifier, division] = cur.classifierDivision.split(":");
    const extraCompatibleDivision = hfuDivisionCompatabilityMap[division];
    if (extraCompatibleDivision) {
      const extraClassifierDivision = [classifier, extraCompatibleDivision].join(":");
      const extraBucket = acc[extraClassifierDivision] ?? [];
      // must be a copy, or percentile calc will mess things up
      extraBucket.push({ ...cur });
      acc[extraClassifierDivision] = extraBucket;
    }

    return acc;
  }, {});

  // mutate runs grouped by classifierDivision to add percentile
  Object.keys(byCD).forEach(CD => {
    byCD[CD].forEach((run, runIndex, allRunsInCD) => {
      run.percentile = PositiveOrMinus1(Percent(runIndex, allRunsInCD.length));
    });
  });

  return byCD;
};

export interface RecHHF {
  classifier: string;
  division: string;
  classifierDivision: string;

  curHHF: number;
  recHHF: number;

  // Weibull
  k: number;
  lambda: number;
  wbl1HHF: number;
  wbl3HHF: number;
  wbl5HHF: number;
  wbl15HHF: number;
  kurtosis: number;
  skewness: number;
  meanSquaredError: number;
  meanAbsoluteError: number;
  superMeanSquaredError: number;
  superMeanAbsoluteError: number;
  maxError: number;

  // Prod 10 vs 15 extras
  prod10HHF?: number;
  prod15HHF?: number;

  // LO: LOCO vs LO vs CO extras
  loHHF?: number;
  locoHHF?: number;
  coHHF?: number;
}

const RecHHFSchema = new mongoose.Schema<RecHHF>({
  classifier: String,
  division: String,
  curHHF: Number,
  recHHF: Number,

  // Weibull
  k: Number,
  lambda: Number,
  wbl1HHF: Number,
  wbl3HHF: Number,
  wbl5HHF: Number,
  wbl15HHF: Number,
  kurtosis: Number,
  skewness: Number,
  meanSquaredError: Number,
  meanAbsoluteError: Number,
  superMeanSquaredError: Number,
  superMeanAbsoluteError: Number,
  maxError: Number,

  // Prod 10 vs 15 extras
  prod10HHF: Number,
  prod15HHF: Number,

  // LO: LOCO vs LO vs CO extras
  loHHF: Number,
  locoHHF: Number,
  coHHF: Number,

  classifierDivision: String,
});

RecHHFSchema.index({ classifier: 1, division: 1 }, { unique: true });
RecHHFSchema.index({ classifierDivision: 1 }, { unique: true });

export const RecHHFs = mongoose.model("RecHHFs", RecHHFSchema);

const classifiersThatUseMoreThan10RoundsBetweenReloads = [
  "99-10",
  "99-56",
  "03-03",
  "03-12",
  "06-01",
  "06-02",
  "09-08",
  "09-10",
  "19-01",
  "19-02",
  "19-03",
  "19-04",
  "20-01",
  "20-02",
  "20-03",
  "21-01",
  "22-01",
  "22-02",
  "23-01",
  "23-02",
  "24-02",
  "24-06",
  "24-08",
  "24-09",
];

const extraHHFsForProd = (
  allScoresRecHHF: number,
  runs: ScoreWithPercentile[],
  classifier: string,
) => {
  const prod10Runs = runs
    .filter(c => new Date(c.sd).getTime() < PROD_15_EFFECTIVE_TS)
    .map(c => c.hf);
  const prod15Runs = runs
    .filter(c => new Date(c.sd).getTime() >= PROD_15_EFFECTIVE_TS)
    .map(c => c.hf);
  const { hhf: prod10HHF } = solveWeibull(prod10Runs);
  const { hhf: prod15HHF } = solveWeibull(prod15Runs);
  const prodAll1015HHF = Math.max(allScoresRecHHF, prod10HHF, prod15HHF);

  const needsMoreThan10 =
    classifiersThatUseMoreThan10RoundsBetweenReloads.includes(classifier);

  return {
    recHHF: needsMoreThan10 ? prodAll1015HHF : allScoresRecHHF,
    prod10HHF,
    prod15HHF,
  };
};

const extraHHFsForLO = (locoHHF: number, locoRuns: ScoreWithPercentile[]) => {
  const loHFs = locoRuns.filter(c => c.division === "lo").map(c => c.hf);
  const coHFs = locoRuns.filter(c => c.division === "co").map(c => c.hf);
  const { hhf: loHHF } = solveWeibull(loHFs);
  const { hhf: coHHF } = solveWeibull(coHFs);

  return {
    recHHF: Math.max(locoHHF, loHHF, coHHF),
    locoHHF,
    loHHF,
    coHHF,
  };
};

const recHHFUpdate = (
  runsRaw: ScoreWithPercentile[],
  division: string,
  classifier: string,
) => {
  if (!runsRaw) {
    return null;
  }

  const runs = minorHFScoresAdapter(runsRaw, division);
  const curHHF = curHHFForDivisionClassifier({ division, number: classifier }) || -1;

  const {
    k,
    lambda,
    hhf: wblHHF,
    hhf1: wbl1HHF,
    hhf3: wbl3HHF,
    hhf5: wbl5HHF,
    hhf15: wbl15HHF,
    kurtosis,
    skewness,
    meanSquaredError,
    meanAbsoluteError,
    superMeanSquaredError,
    superMeanAbsoluteError,
    maxError,
  } = solveWeibull(runs.map(c => c.hf));

  return {
    division,
    classifier,
    classifierDivision: [classifier, division].join(":"),
    curHHF,
    recHHF: wblHHF,
    ...(division === "prod" ? extraHHFsForProd(wbl3HHF, runs, classifier) : {}),
    ...(division === "lo" ? extraHHFsForLO(wbl3HHF, runs) : {}),

    k,
    lambda,
    wbl1HHF,
    wbl3HHF,
    wbl5HHF,
    wbl15HHF,
    kurtosis,
    skewness,
    meanSquaredError,
    meanAbsoluteError,
    superMeanSquaredError,
    superMeanAbsoluteError,
    maxError,
  };
};

/**
 * Upserts a single recHHF after calculating it from all available scores
 * for the given division/classifier combo
 *
 * Used in initial hydration and to update recHHFs after an upload
 */
export const hydrateSingleRecHFF = async (division, classifier) => {
  const allRuns = await runsForRecs({ division, number: classifier });
  const update = recHHFUpdate(allRuns, division, classifier);

  if (update) {
    return RecHHFs.updateOne(
      { division, classifier },
      { $set: update },
      { upsert: true },
    );
  }
  return null;
};

export const hydrateRecHHFsForClassifiers = async classifiers => {
  const runsByClassifierDivision =
    await runsForRecsMultiByClassifierDivision(classifiers);
  const updates = classifiers
    .map(c =>
      recHHFUpdate(
        runsByClassifierDivision[[c.classifier, c.division].join(":")],
        c.division,
        c.classifier,
      ),
    )
    .filter(Boolean);

  return RecHHFs.bulkWrite(
    updates.map(update => {
      const { division, classifier, classifierDivision, ...setUpdate } = update;
      return {
        updateOne: {
          filter: { division, classifier },
          update: {
            $setOnInsert: { division, classifier, classifierDivision },
            $set: setUpdate,
          },
          upsert: true,
        },
      };
    }),
  );
};

/* eslint-disable no-console */
export const rehydrateRecHHF = async (
  divisions = allDivShortNames,
  classifiers = uspsaClassifiers,
) => {
  console.log("hydrating recommended HHFs");
  console.time("recHHFs");
  console.log(`Divisions: ${divisions.length}, Classifiers: ${classifiers.length}`);

  let i = 1;
  const total = divisions.length * classifiers.length;
  for (const division of divisions) {
    for (const classifier of classifiers) {
      await hydrateSingleRecHFF(division, classifier);
      process.stdout.write(`\r${i}/${total}`);
      ++i;
    }
  }

  console.timeEnd("recHHFs");
};
/* eslint-enable no-console */
