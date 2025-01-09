import mongoose from "mongoose";

import { solveWeibull } from "../../../shared/utils/weibull";
import { uspsaClassifiers } from "../dataUtil/classifiersData";
import {
  allDivShortNames,
  classifierDivisionArrayForHFURecHHFs,
  divisionsForRecHHFAdapter,
  hfuDivisionCompatabilityMap,
} from "../dataUtil/divisions";
import { curHHFForDivisionClassifier } from "../dataUtil/hhf";
import { HF, Percent, PositiveOrMinus1 } from "../dataUtil/numbers";

import { minorHFScoresAdapter, Score, Scores } from "./scores";

const LOW_SAMPLE_SIZE_DIVISIONS = new Set([
  "rev",
  "scsa_ss",
  "scsa_osr",
  "scsa_isr",
  "scsa_pcci",
  "scsa_rfri",
]);

/**
 * Calculated recommended HHF by matching lower percent of the score to percentile of shooters
 * who should be able to get that score.
 *
 * Used with approx. 1Percentile for GM (95%) and 5Percentile for M(85%)
 * @param runs classifier scores, sorted by HF or curPercent. MUST BE SORTED for percentile math.
 * @param percentile what percentile to search for 0 to 100
 * @param percent what percent score to assign to it 0 to 100
 *
 * @todo un-export
 */
export const recommendedHHFByPercentileAndPercent = (runs, targetPercentile, percent) => {
  const closestPercentileRun = runs.sort(
    (a, b) =>
      Math.abs(a.percentile - targetPercentile) -
      Math.abs(b.percentile - targetPercentile),
  )[0];

  if (!closestPercentileRun) {
    return 0;
  }

  // if found percentile is higher (more people can achieve this result) than we need
  // to slightly increase the recommendation. If it's lower (less people) -- decrease it.
  const missCorrection = 1 + (closestPercentileRun.percentile - targetPercentile) / 100;
  const percentScale = 1 / (percent / 100.0);

  return HF(closestPercentileRun.hf * missCorrection * percentScale);
};

const r1 = runs =>
  recommendedHHFByPercentileAndPercent(
    runs,
    1.0, // extendedCalibrationTable[division].pGM,
    95,
  );

const r5 = runs =>
  recommendedHHFByPercentileAndPercent(
    runs,
    4.75, // extendedCalibrationTable[division].pM,
    85,
  );

const r15 = runs =>
  recommendedHHFByPercentileAndPercent(
    runs,
    14.5, // extendedCalibrationTable[division].pA,
    75,
  );

// TODO: ignore these maybe in classification calculation?
export const recommendedDeprecatedClassifiers = [
  "99-63",
  "03-09", // ON THE MOVE impossible to setup right, super easy to make much easier than designed
  "08-01",
];

// runs => recHHF function factory, this is where algos are chosen for classifiers/divisions
const decidedHHFFunctions = {
  opn: {
    "23-01": r1,
    "23-02": r1,

    "99-28": r5,
    "99-53": r5,
    "99-61": r5,
    "99-63": r5,
    "03-03": r15,
    "08-02": r15,
    "09-09": r5, // consider deprecation, too easy, probably doesn't scale right for open with same fixed time
  },
  ltd: {
    "99-02": r5,
    "99-07": r5,
    "99-08": r5,
    "99-10": r1,
    "99-11": r1,
    "99-12": r5,
    "99-13": r1,
    "99-14": r1,
    "99-16": r5,
    "99-19": r5,
    "99-21": r1,
    "99-22": r1,
    "99-23": r1,
    "99-24": r5,
    "99-28": r5,
    "99-33": r5,
    "99-40": r5,
    "99-41": r5,
    "99-42": r5,
    "99-46": r5,
    "99-47": r5,
    "99-48": r1,
    "99-51": r5,
    "99-53": r5,
    "99-56": r5,
    "99-57": r5,
    "99-59": r1, // consider deprecation, hard for CBA
    "99-61": r5,
    "99-62": r1,
    "99-63": r1, // consider deprecattion, very hard for CBA

    "03-02": r1,
    "03-03": r5,
    "03-04": r5,
    "03-05": r5,
    "03-07": r5,
    "03-08": r1,
    "03-09": r1,
    "03-11": r1,
    "03-12": r5,
    "03-14": r1,
    "03-18": r1,

    "06-01": r5,
    "06-02": r5,
    "06-03": r5,
    "06-04": r1,
    "06-05": r5,
    "06-06": r5,
    "06-10": r1,

    "08-01": r1, // consider deprecation, hard for CBA
    "08-02": r5,
    "08-03": r1,

    "09-01": r5,
    "09-02": r1,
    "09-03": r5,
    "09-04": r1,
    "09-07": r1,
    "09-08": r5,
    "09-09": r1,
    "09-10": r5,
    "09-13": r5,
    "09-14": r5,

    "13-01": r1,
    "13-02": r1,
    "13-03": r5,
    "13-04": r1,
    "13-05": r1,
    "13-06": r5,
    "13-07": r5,
    "13-08": r1,

    "18-01": r1,
    "18-02": r1,
    "18-03": r5,
    "18-04": r1,
    "18-05": r1,
    "18-06": r1,
    "18-07": r1,
    "18-08": r5,
    "18-09": r5,

    "19-01": r5,
    "19-02": r5,
    "19-03": r1,
    "19-04": r5,

    "20-01": r5,
    "20-02": r1,
    "20-03": r5,

    "21-01": r5,

    "22-01": r5,
    "22-02": r5,
    "22-04": r5,
    "22-05": r5,
    "22-06": r5,
    "22-07": r5,

    "23-01": r1,
    "23-02": r1,
  },
  l10: {
    "23-01": r15, // barely any data, nobody shoots this div really
    "23-02": r15,

    "99-28": r1,
    "09-08": r5,
    "99-47": r5,
    "20-03": r5,
    "13-07": r5,
    "03-14": r5,
    "99-14": r5,
    "99-41": r5,
    "03-11": r1, // consider deprecation, too hard
    "09-07": r1,
    "06-01": r5,
    "99-19": r1,
    "18-09": r5,
    "03-08": r5,
    "09-13": r5,
    "18-05": r5,
    "99-21": r5,
    "09-03": r5,
    "09-04": r5,
    "06-05": r5,
    "03-04": r5,
    "13-02": r5,
    "18-06": r5,
    "99-48": r5,
    "06-10": r1,
    "20-01": r5,
    "99-23": r5,
    "06-04": r5,
    "03-18": r5,
    "13-06": r5,
  },
  prod: {
    "23-01": r1,
    "23-02": r5,

    "22-01": r5,
    "03-12": r5,
    "99-61": r5,
    "99-14": r1,
    "06-02": r5,
    "99-63": r5,
    "18-01": r5,
    "18-02": r1,
    "18-05": r5,
    "03-09": r5,
    "08-01": r5,
    "09-07": r1,
    "03-02": r1,
    "13-02": r1,
    "99-59": r5,
  },
  rev: {
    "23-01": r5,
    "23-02": r5,
  },
  ss: {
    "23-01": r1,
    "23-02": r5,

    "99-59": r5,
    "03-05": r5,
    "03-14": r5,
    "06-02": r5,
    "08-01": r5,
    "03-09": r5,
    "13-02": r5,
    "09-02": r5,
    "99-07": r5,
    "09-14": r1,
    "03-03": r5,
    "13-07": r5,
    "13-08": r5,
    "99-14": r5,
    "99-33": r15,
    "03-11": r5,
    "99-48": r5,
    "03-12": r5,
    "06-10": r5,
    "18-01": r5,
    "18-06": r1,
    "99-47": r5,
  },
  co: {
    "99-02": r5,
    "99-07": r1,
    "99-08": r1,
    "99-10": r15,
    "99-11": r1,
    "99-12": r5,
    "99-13": r1,
    "99-14": r5,
    "99-16": r15,
    "99-19": r5,
    "99-21": r5,
    "99-22": r5,
    "99-23": r5,
    "99-24": r1,
    "99-28": r5,
    "99-33": r15,
    "99-40": r5,
    "99-41": r5,
    "99-42": r15,
    "99-46": r5,
    "99-47": r5,
    "99-48": r5,
    "99-51": r15,
    "99-53": r15,
    "99-56": r5,
    "99-57": r5,
    "99-59": r5,
    "99-61": r5,
    "99-62": r1,
    "99-63": r1, // consider deprecattion, very hard for CB, hard for AM

    "03-02": r1,
    "03-03": r5,
    "03-04": r1,
    "03-05": r15,
    "03-07": r1,
    "03-08": r1,
    "03-09": r1,
    "03-11": r5,
    "03-12": r15,
    "03-14": r15,
    "03-18": r5,

    "06-01": r1,
    "06-02": r5,
    "06-03": r5,
    "06-04": r5,
    "06-05": r5,
    "06-06": r5,
    "06-10": r5,

    "08-01": r1, // consider deprecation, hard for CBA
    "08-02": r5,
    "08-03": r1,

    "09-01": r15,
    "09-02": r1,
    "09-03": r1,
    "09-04": r1,
    "09-07": r1,
    "09-08": r1,
    "09-09": r5, // TODO: double checked, still closest is r1
    "09-10": r5,
    "09-13": r5,
    "09-14": r5,

    "13-01": r1,
    "13-02": r5,
    "13-03": r5,
    "13-04": r5,
    "13-05": r1,
    "13-06": r1,
    "13-07": r1, // TODO: changed to r1 check
    "13-08": r5,

    "18-01": r5,
    "18-02": r1,
    "18-03": r1,
    "18-04": r5,
    "18-05": r1,
    "18-06": r1, // double checked, closest is r1 still
    "18-07": r1,
    "18-08": r1,
    "18-09": r1,

    "19-01": r5,
    "19-02": r1,
    "19-03": r5,
    "19-04": r5,

    "20-01": r1,
    "20-02": r1,
    "20-03": r15,

    "21-01": r5,

    "22-01": r5,
    "22-02": r5,
    "22-04": r1, // wow, super calibrated to r1
    "22-05": r5,
    "22-06": r5,
    "22-07": r1,

    "23-01": r5,
    "23-02": r5,
  },
  lo: {
    "23-01": r1,
    "23-02": r5,
    "99-33": r5,
    "09-09": r15,
    "99-56": r15,
    "03-14": r5,
  },
  pcc: {
    "99-14": r5, // should be either deprecated, modified, or enjoy your 85% max with all the points
    "09-02": r5,
    "18-04": r5,
    "09-09": r5,
    "99-40": r5,
    "03-14": r5,
    "22-05": r5,
    "09-01": r5,
    "09-10": r15,
    "99-51": r15,
    "22-01": r5,
    "23-01": r1,
    "23-02": r15,
  },
};

// First manual recHHF Function review notes:
// TODO: re-review after the percentile miss bugfix
//
// The truth for CO is somewhere between 1%/GM and 5%/M for enough data and normal risk stages.
// 15% and A is where graph usually goes linear and it skews things, so it has to be used only
// when there is serious lack of data, or if the distribution looks funny.
const recommendedHHFFunctionFor = ({ division, number }) => {
  const decided = decidedHHFFunctions[division]?.[number];
  if (decided) {
    return decided;
  }

  // Not enough data for revolver in ANY of the classifiers, drop to r5 for defaults
  if (LOW_SAMPLE_SIZE_DIVISIONS.has(division)) {
    return r5;
  }

  // default to r1 for no special decision, it's often very close now after the fix
  return r1;
};

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

export const recommendedHHFFor = async ({ division, number }) =>
  recommendedHHFFunctionFor({ division, number })(
    await runsForRecs({ division, number }),
  );

export interface RecHHF {
  classifier: string;
  division: string;
  classifierDivision: string;

  curHHF: number;
  recHHF: number;
  rec1HHF: number;
  rec5HHF: number;
  rec15HHF: number;

  // Weibull
  k: number;
  lambda: number;
  wbl1HHF: number;
  wbl5HHF: number;
  wbl15HHF: number;
  kurtosis: number;
  skewness: number;
  meanSquaredError: number;
  meanAbsoluteError: number;
  superMeanSquaredError: number;
  superMeanAbsoluteError: number;
  maxError: number;
}

const RecHHFSchema = new mongoose.Schema<RecHHF>({
  classifier: String,
  division: String,
  curHHF: Number,
  recHHF: Number,
  rec1HHF: Number,
  rec5HHF: Number,
  rec15HHF: Number,

  // Weibull
  k: Number,
  lambda: Number,
  wbl1HHF: Number,
  wbl5HHF: Number,
  wbl15HHF: Number,
  kurtosis: Number,
  skewness: Number,
  meanSquaredError: Number,
  meanAbsoluteError: Number,
  superMeanSquaredError: Number,
  superMeanAbsoluteError: Number,
  maxError: Number,

  classifierDivision: String,
});

RecHHFSchema.index({ classifier: 1, division: 1 }, { unique: true });
RecHHFSchema.index({ classifierDivision: 1 }, { unique: true });

export const RecHHFs = mongoose.model("RecHHFs", RecHHFSchema);

const recHHFUpdate = (
  runsRaw: ScoreWithPercentile[],
  division: string,
  classifier: string,
) => {
  if (!runsRaw) {
    return null;
  }

  const runs = minorHFScoresAdapter(runsRaw, division);
  const rec1HHF = r1(runs);
  const rec5HHF = r5(runs);
  const rec15HHF = r15(runs);
  const curHHF = curHHFForDivisionClassifier({ division, number: classifier }) || -1;

  const {
    k,
    lambda,
    hhf1: wbl1HHF,
    hhf5: wbl5HHF,
    hhf15: wbl15HHF,
    kurtosis,
    skewness,
    meanSquaredError,
    meanAbsoluteError,
    superMeanSquaredError,
    superMeanAbsoluteError,
    maxError,
  } = solveWeibull(
    runs.map(c => c.hf),
    12,
    undefined,
    "neldermead",
  );

  return {
    division,
    classifier,
    classifierDivision: [classifier, division].join(":"),
    curHHF,
    recHHF: wbl5HHF,
    rec1HHF,
    rec5HHF,
    rec15HHF,

    k,
    lambda,
    wbl1HHF,
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
