import mongoose from "mongoose";

import { processImport } from "../utils.js";
import { divIdToShort } from "../dataUtil/divisions.js";

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
  },
  { strict: false }
);
const Score = mongoose.model("Score", ScoreSchema);

const classifierScoreId = (memberId, obj) => {
  return [memberId, obj.classifier, obj.sd, obj.clubid, obj.hf].join("=");
};

const badScoresMap = {
  "125282=23-01=2/18/24=CCS08=15.9574": "CCB-shooter-158-percent",
};

export const hydrateScores = async () => {
  const all = [];
  processImport(
    "../../data/imported",
    /classifiers\.\d+\.json/,
    async (obj) => {
      const memberNumber = obj?.value?.member_data?.member_number;
      const memberId = obj?.value?.member_data?.member_id;
      const classifiers = obj?.value?.classifiers;
      classifiers.forEach((divObj) => {
        const divShort = divIdToShort[divObj?.division_id];
        if (!divShort) {
          // new imports have some weird division numbers (1, 10, etc) no idea what that is
          // just skip for now
          return;
        }

        all.concat(
          divObj.division_classifiers
            .filter(({ source }) => source !== "Legacy") // saves RAM, no point looking at old
            .filter((obj) => !badScoresMap[classifierScoreId(memberId, obj)]) // ignore banned scores
            .map(
              ({
                code,
                source,
                hf,
                percent,
                sd,
                clubid,
                club_name,
                classifier,
              }) => ({
                classifier,
                sd,
                clubid,
                club_name,
                percent: Number(percent),
                hf: Number(hf),
                code,
                source,
                memberNumber,
                division: divShort,
              })
            )
        );
      });
    }
  );
  Score.insertMany(all);
};
