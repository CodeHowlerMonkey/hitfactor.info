import mongoose from "mongoose";

import { UTCDate } from "../../../shared/utils/date.js";

import { processImportAsync } from "../utils.js";
import { divIdToShort } from "../dataUtil/divisions.js";
import { curHHFForDivisionClassifier } from "../dataUtil/hhf.js";
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

export const Score = mongoose.model("Score", ScoreSchema);

const classifierScoreId = (memberId, obj) => {
  return [memberId, obj.classifier, obj.sd, obj.clubid, obj.hf].join("=");
};

const badScoresMap = {
  "125282=23-01=2/18/24=CCS08=15.9574": "CCB-shooter-158-percent",
};

export const hydrateScores = async () => {
  console.log("hydrating initial scores");
  console.time("scores");
  await Score.collection.drop();
  await processImportAsync("../../data/imported", /classifiers\.\d+\.json/, async (obj) => {
    const memberNumber = obj?.value?.member_data?.member_number;
    const memberId = obj?.value?.member_data?.member_id;
    const classifiers = obj?.value?.classifiers;
    return Promise.all(
      classifiers.map((divObj) => {
        const divShort = divIdToShort[divObj?.division_id];
        if (!divShort) {
          // new imports have some weird division numbers (1, 10, etc) no idea what that is
          // just skip for now
          return null;
        }

        const curFileScores = divObj.division_classifiers
          .filter(({ source }) => source !== "Legacy") // saves RAM, no point looking at old
          .filter((obj) => !badScoresMap[classifierScoreId(memberId, obj)]) // ignore banned scores
          .map(
            ({
              code,
              source,
              hf: hfRaw,
              percent: percentString,
              sd,
              clubid,
              club_name,
              classifier,
            }) => {
              const isMajor = source === "Major Match";
              const hhf = isMajor
                ? -1
                : curHHFForDivisionClassifier({
                    division: divShort,
                    number: classifier,
                  });
              const percent = Number(percentString);
              const hf = Number(hfRaw);

              return {
                classifier,
                division: divShort,
                classifierDivision: [classifier, divShort].joing(":"),

                memberNumber,
                memberNumberDivision: [memberNumber, divShort].join(":"),

                sd: UTCDate(sd),
                clubid,
                club_name,
                percent,
                hf: !isNaN(hf) ? hf : undefined,
                hhf,
                code,
                source,
              };
            }
          );

        process.stdout.write(".");
        return Score.insertMany(curFileScores);
      })
    );
  });
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
