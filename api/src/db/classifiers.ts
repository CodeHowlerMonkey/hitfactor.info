/* eslint-disable no-console */

import transform from "lodash.transform";
import uniqBy from "lodash.uniqby";
import mongoose, { Model } from "mongoose";

import {
  basicInfoForClassifier,
  classifiersByNumber,
  ClassifierJSON,
} from "@api/dataUtil/classifiersData";
import { L10_OPTICS_EFFECTIVE_TS, PROD_15_EFFECTIVE_TS } from "@api/dataUtil/divisions";
import { hhfsForDivision } from "@api/dataUtil/hhf";
import { HF, Percent } from "@api/dataUtil/numbers";
import recHHFsPSData from "@data/recHHFsPSData.json";
import { RecHHF } from "@data/types/RecHHF";
import { stringSort } from "@shared/utils/sort";
import { correlation } from "@shared/utils/weibull";

import { RecHHFs } from "./recHHF";
import { ScoreObjectWithVirtuals, Scores, Score } from "./scores";

export interface Classifier {
  classifier: string;
  division: string;
  classifierDivision: string;
  name: string;

  runs: number;

  // Legacy? Distribution Numbers
  inverse95RecPercentPercentile: number;
  inverse85RecPercentPercentile: number;
  inverse75RecPercentPercentile: number;
  inverse60RecPercentPercentile: number;
  inverse40RecPercentPercentile: number;

  inverse95CurPercentPercentile: number;
  inverse85CurPercentPercentile: number;
  inverse75CurPercentPercentile: number;
  inverse60CurPercentPercentile: number;
  inverse40CurPercentPercentile: number;

  // new cc fields
  eloRuns: number;
  eloCorrelation: number;
  majorsRuns: number;
  majorsCorrelation: number;
  classificationCorrelation: number;
}

interface ClassifierVirtuals {
  recHHFs: RecHHF;

  // new cc virtuals
  superMeanSquaredError: number;
  ccQuality: number;
}

export type ClassifierWithVirtuals = Classifier & ClassifierVirtuals & { _id: string };

type ClassifierModel = Model<Classifier, object, ClassifierVirtuals>;

export interface ClassifierDivision {
  classifier: string;
  division: string;
}
export interface HistoricalHHF {
  date: number;
  hhf: number;
}

const calcLegitRunStats = (runs, hhf) =>
  runs.reduce(
    (acc, cur) => {
      const curFraction = cur.hf / hhf;
      if (curFraction < 0.4) {
        acc.D += 1;
      } else if (curFraction < 0.6) {
        acc.C += 1;
      } else if (curFraction < 0.75) {
        acc.B += 1;
      } else if (curFraction < 0.85) {
        acc.A += 1;
      } else if (curFraction < 0.95) {
        acc.M += 1;
      } else if (curFraction >= 0.95) {
        acc.GM += 1;
      }

      if (curFraction >= 1.0) {
        acc.Hundo += 1;
      }

      return acc;
    },
    { D: 0, C: 0, B: 0, A: 0, M: 0, GM: 0, Hundo: 0, Total: runs.length },
  );

const extendedInfoForClassifier = (
  c: ClassifierJSON,
  division: string,
  hitFactorScoresRaw: Score[],
) => {
  if (!division || !c?.id) {
    return {};
  }
  const divisionHHFs = hhfsForDivision(division);
  if (!divisionHHFs) {
    return {};
  }
  const curHHFInfo = divisionHHFs.find(dHHF => dHHF.classifier === c.id);
  const hhf = Number(curHHFInfo?.hhf);

  const hitFactorScores =
    division === "l10"
      ? hitFactorScoresRaw.filter(
          curScore => curScore.sd.getTime() >= L10_OPTICS_EFFECTIVE_TS,
        )
      : hitFactorScoresRaw;

  const topXPercentileStats = x => ({
    [`top${x}PercentilePercent`]:
      hitFactorScores[Math.floor(x * 0.01 * hitFactorScores.length)]?.percent,
    [`top${x}PercentileCurPercent`]: Percent(
      hitFactorScores[Math.floor(x * 0.01 * hitFactorScores.length)]?.hf,
      hhf,
    ),
    [`top${x}PercentileHF`]:
      hitFactorScores[Math.floor(x * 0.01 * hitFactorScores.length)]?.hf,
  });

  const inversePercentileStats = xPercent => ({
    [`inverse${xPercent}CurPercentPercentile`]:
      Percent(
        hitFactorScores.findLastIndex(s => (100 * s.hf) / hhf >= xPercent) + 1,
        hitFactorScores.length,
      ) || 0,
  });

  // sik maf bro
  // historical high hit factors, Math.ceil(x * 100, 2) uniqueness, cause maf is hard on
  // computers and gets too much noise. If they changed HF <= 0.01 it doesn't
  // matter anyway, so toFixed(2)
  const hhfs: HistoricalHHF[] = uniqBy(
    hitFactorScores
      .filter(run => run.percent !== 0 && run.percent !== 100)
      .map(run => ({
        date: new Date(run.sd).getTime(),
        sd: run.sd,
        hhf: HF((100 * run.hf) / run.percent),
      }))
      .sort((a, b) => a.date - b.date),
    hhfData => Math.ceil(hhfData.hhf * 100),
  );
  const clubs = uniqBy(hitFactorScores, "clubid")
    .map(({ clubid: id, club_name: name }) => ({
      id,
      name,
      label: `${id} ${name}`,
    }))
    .filter(({ id }) => !!id)
    .sort((a, b) => stringSort(a, b, "id", 1));

  const yearAgoMs = new Date().getTime() - 365 * 24 * 60 * 60_000;

  const result = {
    updated: curHHFInfo?.updated, //actualLastUpdate, // before was using curHHFInfo.updated, and it's bs
    hhf,
    prevHHF: hhfs.findLast(curHistorical => curHistorical.hhf !== hhf)?.hhf ?? hhf,
    hhfs,
    clubsCount: clubs.length,
    clubs,
    ...transform(
      calcLegitRunStats(hitFactorScores, hhf),
      (r, v, k) => (r[`runsTotalsLegit${k}`] = v),
    ),
    runs: hitFactorScores.length,
    lastYearRuns: hitFactorScores.filter(
      curScore => new Date(curScore.sd).getTime() >= yearAgoMs,
    ).length,
    prod10Runs: hitFactorScores.filter(
      curScore => new Date(curScore.sd).getTime() < PROD_15_EFFECTIVE_TS,
    ).length,
    prod15Runs: hitFactorScores.filter(
      curScore => new Date(curScore.sd).getTime() >= PROD_15_EFFECTIVE_TS,
    ).length,
    top10CurPercentAvg:
      hitFactorScores
        .slice(0, 10)
        .map(s => Percent(s.hf, hhf))
        .reduce((a, b) => a + b, 0) / 10,
    ...topXPercentileStats(1),
    ...topXPercentileStats(2),
    ...topXPercentileStats(5),
    ...inversePercentileStats(100),
    ...inversePercentileStats(95),
    ...inversePercentileStats(85),
    ...inversePercentileStats(75),
    ...inversePercentileStats(60),
    ...inversePercentileStats(40),
  };
  return result;
};

const ClassifierSchema = new mongoose.Schema<
  Classifier,
  ClassifierModel,
  ClassifierVirtuals
>(
  {
    classifier: String,
    division: String,
    classifierDivision: String,
    name: String,

    runs: Number,

    // Distribution Numbers, that Quality Virtual depends on
    inverse95RecPercentPercentile: Number,
    inverse85RecPercentPercentile: Number,
    inverse75RecPercentPercentile: Number,
    inverse60RecPercentPercentile: Number,
    inverse40RecPercentPercentile: Number,

    inverse95CurPercentPercentile: Number,
    inverse85CurPercentPercentile: Number,
    inverse75CurPercentPercentile: Number,
    inverse60CurPercentPercentile: Number,
    inverse40CurPercentPercentile: Number,

    // new cc fields
    eloRuns: Number,
    eloCorrelation: Number,
    majorsRuns: Number,
    majorsCorrelation: Number,
    classificationCorrelation: Number,
  },
  { strict: false },
);

ClassifierSchema.virtual("recHHFs", {
  ref: "RecHHFs",
  foreignField: "classifier",
  localField: "classifier",
  match: classifier => ({ division: classifier.division }),
  justOne: true,
});

[
  "oldHHF",
  "curHHF",
  "recHHF",
  "wbl1HHF",
  "wbl3HHF",
  "wbl5HHF",
  "wbl15HHF",
  "k",
  "lambda",
  "kurtosis",
  "skewness",
  "meanSquaredError",
  "meanAbsoluteError",
  "superMeanSquaredError",
  "superMeanAbsoluteError",
  "maxError",
  "prod10HHF",
  "prod10MajorHHF",
  "prod15HHF",
  "locoHHF",
  "locoMajorHHF",
  "loHHF",
  "coHHF",
  "ltdHHF",
  "opnHHF",
  "prodHHF",
  "schizoHHF",
  "prophecyHHF",
].map(fieldName =>
  ClassifierSchema.virtual(fieldName).get(function () {
    return this.recHHFs?.[fieldName];
  }),
);

ClassifierSchema.virtual("recHHFPSData").get(function () {
  const classifierDivision = [this.classifier, this.division].join(":");
  return recHHFsPSData[classifierDivision];
});

ClassifierSchema.virtual("ccQuality").get(function () {
  return (
    (200 * this.majorsCorrelation + 100 * this.classificationCorrelation) / 2.4 -
    this.superMeanSquaredError
  );
});

ClassifierSchema.index({ classifier: 1, division: 1 }, { unique: true });
ClassifierSchema.index({ division: 1 });
export const Classifiers = mongoose.model("Classifiers", ClassifierSchema);

const consolidatedDivisionsForQuality = (division: string): string[] => {
  switch (division) {
    // optics
    case "co":
    case "lo":
      return ["co", "lo"];

    // irons
    case "ltd":
    case "prod":
    case "ss":
      return ["ltd", "prod", "ss"];

    default:
      return [division];
  }
};

export const singleClassifierExtendedMetaDoc = async (
  division: string,
  classifier: string,
  recHHFReady?: RecHHF,
) => {
  const c = classifiersByNumber[classifier];
  const basicInfo = basicInfoForClassifier(c);
  if (!basicInfo?.code) {
    return null;
  }
  const [recHHFQuery, hitFactorScoresRaw] = await Promise.all([
    recHHFReady ??
      RecHHFs.findOne<RecHHF>({ division, classifier }).select("recHHF").lean(),
    Scores.find({
      division: { $in: consolidatedDivisionsForQuality(division) },
      classifier,
      hf: { $gte: 0 },
      bad: { $ne: true },

      // avoid correlation loss due to garbage data
      // (e.g. NA, NONE, and other common invalid memberNumbers)
      memberNumber: /^[a-zA-Z]+\d+$/i,
    })
      .populate("Shooters")
      .sort({ hf: -1 })
      .limit(0),
  ]);
  const scores = hitFactorScoresRaw
    .map(curScore =>
      curScore.toObject<ScoreObjectWithVirtuals>({
        virtuals: true,
      }),
    )
    .map(curScore => ({
      ...curScore,
      elo: curScore.Shooters?.[0]?.elo ?? 0,
      majors:
        curScore.Shooters?.[0]?.reclassificationsMajorsHistory?.findLast(
          ({ sd }) => curScore.sd.getTime() - sd.getTime() > 0,
        )?.p ?? 0,
      recPercentUncapped:
        curScore.Shooters?.[0]?.reclassificationsRecPercentHistory?.findLast(
          ({ sd }) => curScore.sd.getTime() - sd.getTime() > 0,
        )?.p ?? 0,
    }));

  const eloCorrelationScores = scores.filter(cur => cur.elo > 0 && cur.hf > 0);
  const majorsCorrelationScores = scores.filter(cur => cur.majors > 0 && cur.hf > 0);
  const classificationCorrelationScores = scores.filter(
    cur => cur.recPercentUncapped > 0 && cur.hf > 0,
  );

  const eloCorrelation =
    eloCorrelationScores.length >= 4
      ? correlation(
          eloCorrelationScores.map(cur => cur.elo),
          eloCorrelationScores.map(cur => cur.hf),
        )
      : 0;
  const majorsCorrelation =
    majorsCorrelationScores.length >= 4
      ? correlation(
          majorsCorrelationScores.map(cur => cur.majors),
          majorsCorrelationScores.map(cur => cur.hf),
        )
      : 0;
  const classificationCorrelation =
    classificationCorrelationScores.length >= 4
      ? correlation(
          classificationCorrelationScores.map(cur => cur.recPercentUncapped),
          classificationCorrelationScores.map(cur => cur.hf),
        )
      : 0;

  const hitFactorScores: Score[] = scores.filter(s => s.division === division);
  const recHHF = recHHFQuery?.recHHF ?? 0;
  const inverseRecPercentileStats = xPercent => ({
    [`inverse${xPercent}RecPercentPercentile`]:
      Percent(
        recHHF > 0
          ? hitFactorScores.findLastIndex(
              curScore => (100 * curScore.hf) / recHHF >= xPercent,
            ) + 1
          : -1,
        hitFactorScores.length,
      ) || 0,
  });
  return {
    division,
    ...basicInfo,
    ...extendedInfoForClassifier(c, division, hitFactorScores),
    eloRuns: eloCorrelationScores.length,
    majorsRuns: majorsCorrelationScores.length,
    recHHF,
    ...inverseRecPercentileStats(100),
    ...inverseRecPercentileStats(95),
    ...inverseRecPercentileStats(85),
    ...inverseRecPercentileStats(75),
    ...inverseRecPercentileStats(60),
    ...inverseRecPercentileStats(40),
    eloCorrelation,
    majorsCorrelation,
    classificationCorrelation,
  };
};

let _allDivQuality: Record<string, number> | null = null;
export const allDivisionClassifiersQuality = async () => {
  if (_allDivQuality) {
    return _allDivQuality;
  }

  const [coDB, opnDB, ltdDB, pccDB] = await Promise.all([
    Classifiers.find({ division: "co" }).populate("recHHFs"),
    Classifiers.find({ division: "opn" }).populate("recHHFs"),
    Classifiers.find({ division: "ltd" }).populate("recHHFs"),
    Classifiers.find({ division: "pcc" }).populate("recHHFs"),
  ]);

  const co = coDB.map(c =>
    c.toObject<Classifier & ClassifierVirtuals>({ virtuals: true }),
  );
  const opn = opnDB
    .map(c => c.toObject({ virtuals: true }))
    .reduce((acc, cur) => {
      acc[cur.classifier] = cur;
      return acc;
    }, {});
  const ltd = ltdDB
    .map(c => c.toObject({ virtuals: true }))
    .reduce((acc, cur) => {
      acc[cur.classifier] = cur;
      return acc;
    }, {});
  const pcc = pccDB
    .map(c => c.toObject({ virtuals: true }))
    .reduce((acc, cur) => {
      acc[cur.classifier] = cur;
      return acc;
    }, {});

  _allDivQuality = co.reduce((acc, c) => {
    const id = c.classifier;
    acc[id] =
      (c.ccQuality + opn[id].ccQuality + ltd[id].ccQuality + pcc[id].ccQuality) / 4;
    return acc;
  }, {});

  return _allDivQuality;
};

export const rehydrateSingleClassifier = async (
  classifier: string,
  division: string,
  recHHF?: RecHHF,
) => {
  const doc = await singleClassifierExtendedMetaDoc(division, classifier, recHHF);
  if (doc) {
    return Classifiers.updateOne(
      { division, classifier },
      { $set: doc },
      { upsert: true },
    );
  }

  return null;
};

// linear rehydration to prevent OOMs on uploader and mongod
export const rehydrateClassifiers = async (classifiers: ClassifierDivision[]) => {
  console.log(`selecting RecHHFs for ${classifiers.length} classifiers`);
  const recHHFs = await RecHHFs.find({
    classifierDivision: {
      $in: classifiers.map(c => [c.classifier, c.division].join(":")),
    },
  })
    .select({ recHHF: true, _id: false, classifierDivision: true })
    .lean();
  const recHHFsByClassifierDivision = recHHFs.reduce((acc, cur) => {
    acc[cur.classifierDivision] = cur;
    return acc;
  }, {});

  console.log(`recHHF ready, rehydrating...`);
  let i = classifiers.length;
  for (const classifierDivision of classifiers) {
    i--;
    const { classifier, division } = classifierDivision;
    console.log(`${classifier} in ${division}...`);
    await rehydrateSingleClassifier(
      classifier,
      division,
      recHHFsByClassifierDivision[[classifier, division].join(":")],
    );
    console.log(`done, ${i}/${classifiers.length} remaining`);
  }
};
