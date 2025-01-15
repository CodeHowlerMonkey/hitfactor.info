/* eslint-disable no-console */
import transform from "lodash.transform";
import uniqBy from "lodash.uniqby";
import mongoose, { Model } from "mongoose";

import { stringSort } from "../../../shared/utils/sort";
import { correlation } from "../../../shared/utils/weibull";
import {
  basicInfoForClassifier,
  classifiers as _classifiers,
  classifiersByNumber,
  ClassifierJSON,
} from "../dataUtil/classifiersData";
import {
  divisionsForScoresAdapter,
  divShortNames,
  PROD_15_EFFECTIVE_TS,
} from "../dataUtil/divisions";
import { hhfsForDivision } from "../dataUtil/hhf";
import { HF, Percent } from "../dataUtil/numbers";

import { RecHHFs, RecHHF } from "./recHHF";
import { minorHFScoresAdapter, ScoreObjectWithVirtuals, Scores } from "./scores";
import { Score } from "./scores";

export interface Classifier {
  classifier: string;
  division: string;
  classifierDivision: string;

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
  eloCorrelation: number;
  classificationCorrelation: number;
}

interface ClassifierVirtuals {
  recHHFs: RecHHF;
  quality: number;
  hqQuality: number;

  // new cc virtuals
  loss: number;
  meanLL: number;
  superMeanSquaredError: number;
  ccQuality: number;
}

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
  hitFactorScores: Score[],
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
    [`inverse${xPercent}CurPercentPercentile`]: Percent(
      hitFactorScores.findLastIndex(s => (100 * s.hf) / hhf >= xPercent),
      hitFactorScores.length,
    ),
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
    prod10Runs: hitFactorScores.filter(
      c => new Date(c.sd).getTime() < PROD_15_EFFECTIVE_TS,
    ).length,
    prod15Runs: hitFactorScores.filter(
      c => new Date(c.sd).getTime() >= PROD_15_EFFECTIVE_TS,
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
    eloCorrelation: Number,
    classificationCorrelation: Number,
  },
  { strict: false },
);

const WORST_QUALITY_DISTANCE_FROM_TARGET = 100;
const scoresCountOffset = runsCount => {
  if (runsCount < 200) {
    return -40;
  } else if (runsCount < 400) {
    return -20;
  } else if (runsCount < 750) {
    return -10;
  } else if (runsCount < 1400) {
    return -5;
  }

  return 0;
};

ClassifierSchema.virtual("recHHFs", {
  ref: "RecHHFs",
  foreignField: "classifier",
  localField: "classifier",
  match: classifier => ({ division: classifier.division }),
  justOne: true,
});

[
  "curHHF",
  "recHHF",
  "rec1HHF",
  "rec5HHF",
  "rec15HHF",
  "wbl1HHF",
  "wbl5HHF",
  "wbl15HHF",
  "k",
  "lambda",
  "loss",
  "meanLL",
  "kurtosis",
  "skewness",
  "meanSquaredError",
  "meanAbsoluteError",
  "superMeanSquaredError",
  "superMeanAbsoluteError",
  "maxError",
  "prod10HHF",
  "prod15HHF",
].map(fieldName =>
  ClassifierSchema.virtual(fieldName).get(function () {
    return this.recHHFs?.[fieldName];
  }),
);

ClassifierSchema.virtual("ccQuality").get(function () {
  return (
    (200 * this.eloCorrelation + 100 * this.classificationCorrelation) / 2.4 -
    this.superMeanSquaredError
  );
});

ClassifierSchema.virtual("quality").get(function () {
  return (
    scoresCountOffset(this.runs) +
    Percent(
      WORST_QUALITY_DISTANCE_FROM_TARGET -
        (10.0 * Math.abs(1 - this.inverse95RecPercentPercentile) +
          4.0 * Math.abs(5 - this.inverse85RecPercentPercentile) +
          1.0 * Math.abs(15 - this.inverse75RecPercentPercentile) +
          0.5 * Math.abs(45 - this.inverse60RecPercentPercentile) +
          0.3 * Math.abs(85 - this.inverse40RecPercentPercentile)),
      WORST_QUALITY_DISTANCE_FROM_TARGET,
    )
  );
});
ClassifierSchema.virtual("hqQuality").get(function () {
  return (
    scoresCountOffset(this.runs) +
    Percent(
      WORST_QUALITY_DISTANCE_FROM_TARGET -
        (10.0 * Math.abs(1 - this.inverse95CurPercentPercentile) +
          4.0 * Math.abs(5 - this.inverse85CurPercentPercentile) +
          1.0 * Math.abs(15 - this.inverse75CurPercentPercentile) +
          0.5 * Math.abs(45 - this.inverse60CurPercentPercentile) +
          0.3 * Math.abs(85 - this.inverse40CurPercentPercentile)),
      WORST_QUALITY_DISTANCE_FROM_TARGET,
    )
  );
});
ClassifierSchema.index({ classifier: 1, division: 1 }, { unique: true });
ClassifierSchema.index({ division: 1 });
export const Classifiers = mongoose.model("Classifiers", ClassifierSchema);

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
    recHHFReady ?? RecHHFs.findOne({ division, classifier }).select("recHHF").lean(),
    Scores.find({
      division: { $in: divisionsForScoresAdapter(division) },
      classifier,
      hf: { $gte: 0 },
      bad: { $ne: true },
    })
      .populate("Shooters")
      .sort({ hf: -1 })
      .limit(0),
  ]);
  const scores = hitFactorScoresRaw
    .map(curScore => curScore.toObject({ virtuals: true }) as ScoreObjectWithVirtuals)
    .map(curScore => ({
      ...curScore,
      elo: curScore.Shooters?.[0]?.elo,
      recPercentUncapped:
        curScore.Shooters?.[0]?.reclassificationsRecPercentUncappedCurrent,
    }));

  // best scores correlate better than most recent on 20-01:co
  const eloCorrelationScores = uniqBy(
    scores.filter(cur => cur.elo > 0 && cur.hf > 0).sort((a, b) => b.hf - a.hf),
    cur => cur.memberNumber,
  );
  const eloCorrelation =
    eloCorrelationScores.length >= 4
      ? correlation(
          eloCorrelationScores.map(cur => cur.elo),
          eloCorrelationScores.map(cur => cur.hf),
        )
      : 0;
  const classificationCorrelationScores = uniqBy(
    scores
      .filter(cur => cur.recPercentUncapped > 0 && cur.hf > 0)
      .sort((a, b) => b.hf - a.hf),
    cur => cur.memberNumber,
  );
  const classificationCorrelation =
    classificationCorrelationScores.length >= 4
      ? correlation(
          classificationCorrelationScores.map(cur => cur.recPercentUncapped),
          classificationCorrelationScores.map(cur => cur.hf),
        )
      : 0;

  const hitFactorScores: Score[] = minorHFScoresAdapter(scores, division);

  const recHHF = recHHFQuery?.recHHF ?? 0;
  const inverseRecPercentileStats = xPercent => ({
    [`inverse${xPercent}RecPercentPercentile`]: Percent(
      recHHF > 0
        ? hitFactorScores.findLastIndex(
            curScore => (100 * curScore.hf) / recHHF >= xPercent,
          )
        : -1,
      hitFactorScores.length,
    ),
  });
  return {
    division,
    ...basicInfo,
    ...extendedInfoForClassifier(c, division, hitFactorScores),
    recHHF,
    ...inverseRecPercentileStats(100),
    ...inverseRecPercentileStats(95),
    ...inverseRecPercentileStats(85),
    ...inverseRecPercentileStats(75),
    ...inverseRecPercentileStats(60),
    ...inverseRecPercentileStats(40),
    eloCorrelation,
    classificationCorrelation,
  };
};

// TODO: classifier quality score, maybe dependent on number of scores, but most importantly:
// 10* percentDiffFromGMTarget 4*fromM 1*fromA
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

  const co: (Classifier & ClassifierVirtuals)[] = coDB.map(c =>
    c.toObject({ virtuals: true }),
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

let _allDivQualityScsa: Record<string, number> | null = null;
export const allScsaDivisionClassifiersQuality = async () => {
  const [coDB, opnDB, rfroDB, rfpoDB] = await Promise.all([
    Classifiers.find({ division: "scsa_co" }),
    Classifiers.find({ division: "scsa_opn" }),
    Classifiers.find({ division: "scsa_rfro" }),
    Classifiers.find({ division: "scsa_rfpo" }),
  ]);

  const co: (Classifier & ClassifierVirtuals)[] = coDB.map(c =>
    c.toObject({ virtuals: true }),
  );
  const opn = opnDB
    .map(c => c.toObject({ virtuals: true }))
    .reduce((acc, cur) => {
      acc[cur.classifier] = cur;
      return acc;
    }, {});
  const rfro = rfroDB
    .map(c => c.toObject({ virtuals: true }))
    .reduce((acc, cur) => {
      acc[cur.classifier] = cur;
      return acc;
    }, {});
  const rfpo = rfpoDB
    .map(c => c.toObject({ virtuals: true }))
    .reduce((acc, cur) => {
      acc[cur.classifier] = cur;
      return acc;
    }, {});

  _allDivQualityScsa = co.reduce((acc, c) => {
    const id = c.classifier;
    acc[id] = (c.quality + opn[id].quality + rfro[id].quality + rfpo[id].quality) / 4;
    return acc;
  }, {});

  return _allDivQualityScsa;
};

export const hydrateClassifiersExtendedMeta = async () => {
  let i = 0;
  const total = _classifiers.length * 9;
  console.log("hydrating classifiers extended meta");
  console.time("classifiers");
  for (const division of divShortNames) {
    for (const c of _classifiers) {
      ++i;
      const { classifier } = c;
      await rehydrateSingleClassifier(classifier, division);
      process.stdout.write(`\r${i}/${total}`);
    }
  }
  console.timeEnd("classifiers");
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

  for (const classifierDivision of classifiers) {
    const { classifier, division } = classifierDivision;
    await rehydrateSingleClassifier(
      classifier,
      division,
      recHHFsByClassifierDivision[[classifier, division].join(":")],
    );
  }
};
