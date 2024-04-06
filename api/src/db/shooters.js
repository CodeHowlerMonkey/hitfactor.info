import mongoose from "mongoose";

import { loadJSON, processImportAsync } from "../utils.js";
import { divIdToShort } from "../dataUtil/divisions.js";
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

const ShooterSchema = new mongoose.Schema(
  {
    // TODO: fill it out after observing DB
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
      };

      process.stdout.write(".");
      return Shooter.create(shooterDoc);
    }
  );
  console.timeEnd("shooters");
};
