import mongoose from "mongoose";

import { UTCDate } from "../../../shared/utils/date.js";

import { processImportAsync, processImportAsyncSeq } from "../utils.js";
import { divIdToShort } from "../dataUtil/divisions.js";
import { curHHFFor } from "../dataUtil/hhf.js";
import { N, Percent, PositiveOrMinus1 } from "../dataUtil/numbers.js";

const ScoreSchema = new mongoose.Schema(
  {
    classifier: String,
    sd: Date,
    clubid: String,
    club_name: String,
    percent: Number,
    hf: Number,
    code: { type: String, maxLength: 1 },
    source: String,
    memberNumber: String,
    division: String,

    // compound keys for lookups
    classifierDivision: String,
    memberNumberDivision: String,
  },
  { strict: false }
);
ScoreSchema.virtual("isMajor").get(function () {
  return this.source === "Major Match";
});
ScoreSchema.virtual("HHFs", {
  ref: "RecHHF",
  foreignField: "classifierDivision",
  localField: "classifierDivision",
});
ScoreSchema.virtual("recHHF").get(function () {
  return this.HHFs?.[0]?.curHHF || -1;
});
ScoreSchema.virtual("curPercent").get(function () {
  const curHHF = this.HHFs?.[0]?.curHHF || -1;
  return this.isMajor ? this.percent : PositiveOrMinus1(Percent(this.hf, curHHF));
});
ScoreSchema.virtual("recPercent").get(function () {
  const recHHF = this.HHFs?.[0]?.recHHF || -1;
  return this.isMajor ? this.percent : PositiveOrMinus1(Percent(this.hf, recHHF));
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

export const Score = mongoose.model("Score", ScoreSchema);

const classifierScoreId = (memberId, obj) => {
  return [memberId, obj.classifier, obj.sd, obj.clubid, obj.hf].join("=");
};

const badScoresMap = {
  "125282=23-01=2/18/24=CCS08=15.9574": "CCB-shooter-158-percent",
};

const isMajor = (source) => source === "Major Match";

const scoresFromClassifierFile = (fileObj) => {
  const memberNumber = fileObj?.value?.member_data?.member_number;
  const memberId = fileObj?.value?.member_data?.member_id;
  const classifiers = fileObj?.value?.classifiers;

  if (!memberNumber || !classifiers?.length) {
    return [];
  }
  return classifiers
    .map((divObj) => {
      const division = divIdToShort[divObj?.division_id];
      if (!division) {
        // new imports have some weird division numbers (1, 10, etc) no idea what that is
        // just skip for now
        return [];
      }

      return divObj.division_classifiers
        .filter(({ source }) => source !== "Legacy") // no point looking at scores without HF
        .filter((o) => !badScoresMap[classifierScoreId(memberId, o)]) // ignore banned scores
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
          hhf: isMajor(source) ? -1 : curHHFFor({ division, classifier }),
          code,
          source,
        }));
    })
    .filter(Boolean)
    .flat();
};

const batchHydrateScores = async (letter) => {
  let curBatch = [];
  process.stdout.write("\n");
  process.stdout.write(letter);
  process.stdout.write(": ");
  return processImportAsyncSeq(
    "../../data/imported",
    new RegExp(`classifiers\\.${letter}\\.\\d+\\.json`),
    async (obj) => {
      const curFileScores = scoresFromClassifierFile(obj);
      curBatch = curBatch.concat(curFileScores);
      process.stdout.write(".");
      if (curBatch.length >= 512) {
        await Score.bulkWrite(
          curBatch.map((s) => ({
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
          }))
        );
        process.stdout.write("⬆︎");
        curBatch = [];
      }
    }
  );
};

export const hydrateScores = async () => {
  console.log("hydrating scores");
  console.time("scores");

  await batchHydrateScores("gm");
  await batchHydrateScores("m");
  await batchHydrateScores("a");
  await batchHydrateScores("b");
  // TODO: CDU when they are imported

  console.timeEnd("scores");
};

export const shooterScoresChartData = async ({ memberNumber, division }) => {
  const scores = await Score.find({ memberNumber, division })
    .populate("HHFs")
    .limit(0)
    .sort({ sd: -1 });
  return scores
    .map((doc) => doc.toObject({ virtuals: true }))
    .map((run) => ({
      x: run.sd,
      recPercent: run.recPercent,
      curPercent: run.curPercent,
      percent: run.percent,
      classifier: run.classifier,
    }))
    .filter((run) => !!run.classifier); // no majors for now in the graph
};

export const scoresForDivisionForShooter = async ({ division, memberNumber }) => {
  const scores = await Score.find({ division, memberNumber }).populate("HHFs").limit(0);
  return scores.map((doc, index) => {
    const obj = doc.toObject({ virtuals: true });
    obj.index = index;
    return obj;
  });
};
