import mongoose, { Schema } from "mongoose";

import { loadJSON, processImportAsync } from "../utils.js";
import { divIdToShort, mapDivisionsAsync } from "../dataUtil/divisions.js";
import { curHHFForDivisionClassifier } from "../dataUtil/hhf.js";
import { Percent, PositiveOrMinus1 } from "../dataUtil/numbers.js";
import { calculateUSPSAClassification } from "../../../shared/utils/classification.js";
import { Score } from "./scores.js";

const memberIdToNumberMap = loadJSON("../../data/meta/memberIdToNumber.json");
const memberNumberFromMemberData = (memberData) => {
  try {
    const easy = memberData.member_number;
    if (!easy || easy.trim().toLowerCase() === "private") {
      return memberIdToNumberMap[String(memberData.member_id)];
    }
    return easy;
  } catch (err) {
    console.log(err);
  }

  return "BAD DATA";
};

// TODO: move score calculation to reclassifications, so we don't rely on USPSA
// flags
export const scoresAge = async (division, memberNumber, maxScores = 4) => {
  const scoreDates = await Score.find({ memberNumber, division, code: "Y" })
    .sort({ sd: -1 })
    .limit(maxScores)
    .select("sd")
    .lean();

  return scoreDates
    .map((c) => (new Date() - new Date(c.sd)) / (28 * 24 * 60 * 60 * 1000)) // millisecconds to 28-day "months"
    .reduce((acc, curV, unusedIndex, arr) => acc + curV / arr.length, 0);
};

const DivReclassificationSchema = new Schema({
  percent: Number,
  highPecent: Number,
  percentWithDates: [{ p: Number, sd: Date }],
});

const ShooterSchema = new Schema(
  {
    memberId: String,
    memberNumber: String, // TODO: try unique on that and Id
    name: String,

    classifications: { type: Map, of: String },
    high: { type: Map, of: Number | NaN },
    current: { type: Map, of: Number | NaN },

    reclassificationsByCurPercent: { type: Map, of: DivReclassificationSchema },
    reclassificationsByRecPercent: { type: Map, of: DivReclassificationSchema },

    ages: { type: Map, of: Number },

    data: {
      member_id: String,
      member_number: String,
      first_name: String,
      middle_name: String,
      last_name: String,
      suffix: String,
      salutation: String,
      joined_date: Date,
      expiration_date: Date,
      life_member: Boolean,
      privacy: Boolean,
    },
  },
  { strict: false }
);
ShooterSchema.index({ memberNumber: 1 });
ShooterSchema.index({ memberId: 1 });

export const Shooter = mongoose.model("Shooter", ShooterSchema);

export const hydrateShooters = async () => {
  console.log("hydrating shooters");
  await Shooter.collection.drop();
  console.time("shooters");
  await processImportAsync(
    "../../data/imported",
    /classification\.\d+\.json/,
    async ({ value: c }) => {
      const memberNumber = memberNumberFromMemberData(c.member_data);
      const shooterDoc = {
        data: c.member_data,
        memberId: c.member_data.member_id,
        memberNumber,
        name: [
          c.member_data.first_name,
          c.member_data.last_name,
          c.member_data.suffix,
        ]
          .filter(Boolean)
          .join(" "),
        classifications: c.classifications.reduce(
          (acc, c) => ({
            ...acc,
            [divIdToShort[c.division_id]]: c.class,
          }),
          {}
        ),
        high: c.classifications.reduce(
          (acc, c) => ({
            ...acc,
            [divIdToShort[c.division_id]]: Number(c.high_percent),
          }),
          {}
        ),
        current: c.classifications.reduce(
          (acc, c) => ({
            ...acc,
            [divIdToShort[c.division_id]]: Number(c.current_percent),
          }),
          {}
        ),
        reclassificationsByCurPercent: calculateUSPSAClassification(
          (await Score.find({ memberNumber }).limit(0)).map((doc) =>
            doc.toObject({ virtuals: true })
          ),
          "curPercent"
        ),
        reclassificationsByRecPercent: calculateUSPSAClassification(
          (await Score.find({ memberNumber }).limit(0)).map((doc) =>
            doc.toObject({ virtuals: true })
          ),
          "recPercent"
        ),
        ages: mapDivisionsAsync((div) => scoresAge(div, memberNumber)),
        age1s: mapDivisionsAsync((div) => scoresAge(div, memberNumber, 1)),
      };

      process.stdout.write(".");
      return Shooter.create(shooterDoc);
    }
  );
  console.timeEnd("shooters");
};
