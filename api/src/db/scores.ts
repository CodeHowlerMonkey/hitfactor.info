/* eslint-disable no-console */
import mongoose, { Model } from "mongoose";

import {
  divIdToShort,
  divisionsForScoresAdapter,
  hfuDivisionsShortNamesThatNeedMinorHF,
  minorDivisions,
  uspsaDivShortNames,
} from "../../../shared/constants/divisions";
import { UTCDate } from "../../../shared/utils/date";
import { curHHFForDivisionClassifier } from "../dataUtil/hhf";
import { N, Percent, PositiveOrMinus1 } from "../dataUtil/numbers";
import { processImportAsyncSeq } from "../utils";

export interface Score {
  upload?: string;
  classifier: string;
  sd: Date;
  clubid?: string;
  club_name?: string;
  percent: number;
  hf: number;
  minorHF?: number;
  code: string;
  source: string;
  shooterFullName?: string;
  memberNumber: string;
  division: string;

  // extra fields for sport/matchType
  type: string;
  subType: string;
  templateName: string;

  // extra stage perf fields
  stageTimeSecs?: string; // keeping as-is from PS
  stagePeakTimeSecs?: number; // applicable to SCSA only
  points?: number;
  penalties?: number;
  modified: Date;
  steelMikes?: number;
  steelHits?: number;
  steelNS?: number;
  steelNPM?: number;
  rawPoints?: number;
  strings?: number[];
  targetHits?: number[];
  device: string;

  // compound keys for lookups
  classifierDivision: string;
  memberNumberDivision: string;
}

// TODO: move to RecHHF
export interface RecHHF {
  curHHF: number;
  recHHF: number;
}

export interface ScoreVirtuals {
  Shooters: Record<string, any>[];
  HHFs: RecHHF[];
  curHHF: number;
  recHHF: number;
  hfuHF: number;
  isMajor: boolean;
  curPercent: number;
  recPercent: number;
}

type ScoreModel = Model<Score, object, ScoreVirtuals>;
export type ScoreObjectWithVirtuals = Score & ScoreVirtuals & { _id: string };

const ScoreSchema = new mongoose.Schema<Score, ScoreModel, ScoreVirtuals>(
  {
    classifier: String,
    sd: Date,
    clubid: String,
    club_name: String,
    percent: Number,
    hf: Number,
    minorHF: Number,
    code: { type: String, maxLength: 1 },
    source: String,
    shooterFullName: String,
    memberNumber: String,
    division: String,

    // extra fields for sport/matchType
    type: String,
    subType: String,
    templateName: String,

    // extra stage perf fields
    stageTimeSecs: String, // keeping as-is from PS
    stagePeakTimeSecs: Number, // applicable to SCSA only
    points: Number,
    penalties: Number,
    modified: Date,
    steelMikes: Number,
    steelHits: Number,
    steelNS: Number,
    steelNPM: Number,
    rawPoints: Number,
    strings: [Number],
    targetHits: [Number],
    device: String,

    // compound keys for lookups
    classifierDivision: String,
    memberNumberDivision: String,
  },
  { strict: false },
);

// not all scores have minorHF, so this is an adapter around it or regular hf based on sport/division
ScoreSchema.virtual("hfuHF").get(function () {
  const division = this.division || "";
  if (division.startsWith("pcsl_")) {
    return this.hf;
  }

  // prod lo co pcc
  // comp opt irn car
  if (minorDivisions.includes(division)) {
    return this.hf;
  }

  return this.minorHF;
});
ScoreSchema.virtual("isMajor").get(function () {
  return this.source === "Major Match";
});
ScoreSchema.virtual("Shooters", {
  ref: "Shooters",
  foreignField: "memberNumberDivision",
  localField: "memberNumberDivision",
});
ScoreSchema.virtual("HHFs", {
  ref: "RecHHFs",
  foreignField: "classifierDivision",
  localField: "classifierDivision",
});
ScoreSchema.virtual("recHHF").get(function () {
  return this.HHFs?.[0]?.recHHF || -1;
});
ScoreSchema.virtual("curHHF").get(function () {
  return this.HHFs?.[0]?.curHHF || -1;
});
ScoreSchema.virtual("curPercent").get(function () {
  return this.isMajor ? this.percent : PositiveOrMinus1(Percent(this.hf, this.curHHF, 4));
});
ScoreSchema.virtual("recPercent").get(function () {
  return this.isMajor ? this.percent : PositiveOrMinus1(Percent(this.hf, this.recHHF, 4));
});
ScoreSchema.virtual("hfuPercent").get(function () {
  return this.isMajor ? -1 : PositiveOrMinus1(Percent(this.hfuHF, this.recHHF, 4));
});
// TODO: get rid of percentMinusCurPercent
ScoreSchema.virtual("percentMinusCurPercent").get(function () {
  return this.curPercent >= 0 ? N(this.percent - this.curPercent) : -1;
});

ScoreSchema.index({ classifier: 1, division: 1 });
ScoreSchema.index({ memberNumber: 1 });
ScoreSchema.index({ memberNumberDivision: 1 });
ScoreSchema.index({ classifierDivision: 1 });
ScoreSchema.index({ hf: -1 });
ScoreSchema.index({ classifier: 1, division: 1, hf: -1 });

export const Scores = mongoose.model<typeof ScoreSchema>("Scores", ScoreSchema);

const classifierScoreId = (memberId, obj) =>
  [memberId, obj.classifier, obj.sd, obj.clubid, obj.hf].join("=");

const badScoresMap = {
  "125282=23-01=2/18/24=CCS08=15.9574": "CCB-shooter-158-percent",
};

const isMajor = source => source === "Major Match";

/**
 * Picks runs for division. As-is for USPSA, or switches hf to minorHF for
 * HFU's comp and irn division (since they have major PF scores from USPSA divisions)
 *
 * If minorHF is needed, but not avilale - the run is dropped.
 * WARNING: mutates runs' hf to set it to minorHF
 */
export const minorHFScoresAdapter = (runs, division) => {
  if (!hfuDivisionsShortNamesThatNeedMinorHF.includes(division)) {
    return runs;
  }

  return runs
    .filter(r => r.minorHF > 0)
    .map(r => {
      r.originalHF = r.hf;
      r.hf = r.minorHF;
      return r;
    });
};

export const scoresFromClassifierFile = fileObj => {
  const memberNumber = fileObj?.value?.member_data?.member_number;
  const memberId = fileObj?.value?.member_data?.member_id;
  const classifiers = fileObj?.value?.classifiers;

  if (!memberNumber || !classifiers?.length) {
    return [];
  }
  return classifiers
    .map(divObj => {
      const division = divIdToShort[divObj?.division_id];
      if (!division) {
        // new imports have some weird division numbers (1, 10, etc) no idea what that is
        // just skip for now
        return [];
      }

      return divObj.division_classifiers
        .filter(({ source }) => source !== "Legacy") // no point looking at scores without HF
        .filter(o => !badScoresMap[classifierScoreId(memberId, o)]) // ignore banned scores
        .map(({ code, source, hf, percent, sd, clubid, club_name, classifier }) => ({
          classifier,
          division,
          classifierDivision: [classifier, division].join(":"),

          memberNumber,
          memberNumberDivision: [memberNumber, division].join(":"),

          sd: UTCDate(sd),
          clubid,
          club_name,
          percent: Number(percent),
          hf: Number(hf) || (isMajor(source) ? undefined : 0),
          hhf: isMajor(source)
            ? -1
            : curHHFForDivisionClassifier({ division, number: classifier }),
          code,
          source,
        }));
    })
    .filter(Boolean)
    .flat();
};

const hydrateScoresBatch = async batch => {
  await Scores.bulkWrite(
    batch.map(s => ({
      updateOne: {
        filter: {
          memberNumberDivision: s.memberNumberDivision,
          classifierDivision: s.classifierDivision,
          hf: s.hf,
          sd: s.sd,
          // some PS matches don't have club set, but all USPSA uploads do,
          // so to prevent dupes, don't filter by club on score upsert
          // clubid: s.clubid,
        },
        update: { $set: s },
        upsert: true,
      },
    })),
  );
  process.stdout.write("⬆︎");
};

const batchHydrateScores = async letter => {
  let curBatch = [];
  process.stdout.write("\n");
  process.stdout.write(letter);
  process.stdout.write(": ");
  await processImportAsyncSeq(
    "../../data/imported",
    new RegExp(`classifiers\\.${letter}\\.\\d+\\.json`),
    async obj => {
      const curFileScores = scoresFromClassifierFile(obj);
      curBatch = curBatch.concat(curFileScores);
      process.stdout.write(".");
      if (curBatch.length >= 512) {
        await hydrateScoresBatch(curBatch);
        curBatch = [];
      }
    },
  );
  if (curBatch.length) {
    await hydrateScoresBatch(curBatch);
  }
};

// legacy hydration from uspsa import files,
// uspsa was manual: 1) import 2) hydrate
export const hydrateScores = async () => {
  console.log("hydrating scores");
  console.time("scores");

  await batchHydrateScores("gm");
  await batchHydrateScores("m");
  await batchHydrateScores("a");
  await batchHydrateScores("b");
  await batchHydrateScores("c");
  await batchHydrateScores("d");

  console.timeEnd("scores");
};

export const shooterScoresChartData = async ({ memberNumber, division }) => {
  const scores = await Scores.find({
    memberNumber,
    division: { $in: divisionsForScoresAdapter(division) },
    bad: { $ne: true },
  })
    .populate("HHFs")
    .limit(0)
    .sort({ sd: -1 });

  return minorHFScoresAdapter(
    scores.map(s => s.toObject({ virtuals: true })),
    division,
  )
    .map(run => ({
      x: run.sd,
      recPercent: run.recPercent,
      curPercent: run.curPercent,
      percent: run.percent,
      classifier: run.classifier,
    }))
    .filter(run => !!run.classifier); // no majors for now in the graph
};

export const scoresForDivisionForShooter = async ({ division, memberNumber }) => {
  const scores = await Scores.find({
    division: { $in: divisionsForScoresAdapter(division) },
    memberNumber,
    bad: { $ne: true },
  })
    .populate("HHFs")
    .sort({ sd: -1, hf: -1 })
    .limit(0);

  return minorHFScoresAdapter(
    scores.map(s => s.toObject({ virtuals: true })),
    division,
  ).map((obj, index) => {
    obj.index = index;
    return obj;
  });
};

// TODO: intro same functionality for other sports
export const uspsaDivisionsPopularity = async (year = 0) => {
  const after = 365 * (year + 1);
  const before = 365 * year;

  return Scores.aggregate([
    {
      $project: {
        division: true,
        sd: true,
        age: {
          $dateDiff: {
            startDate: "$sd",
            endDate: "$$NOW",
            unit: "day",
          },
        },
      },
    },
    {
      $match: {
        age: { $lte: after, $gte: before },
        division: { $in: uspsaDivShortNames },
      },
    },
    {
      $group: {
        _id: "$division",
        scores: {
          $sum: 1,
        },
      },
    },
    {
      $addFields: {
        start: {
          $dateSubtract: {
            startDate: "$$NOW",
            unit: "day",
            amount: after,
          },
        },
        end: {
          $dateSubtract: {
            startDate: "$$NOW",
            unit: "day",
            amount: before,
          },
        },
      },
    },
    { $sort: { scores: -1 } },
  ]);
};
