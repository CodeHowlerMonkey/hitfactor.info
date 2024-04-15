import mongoose, { Schema } from "mongoose";

import { loadJSON, processImportAsync } from "../utils.js";
import { divIdToShort, mapDivisions, mapDivisionsAsync } from "../dataUtil/divisions.js";
import {
  calculateUSPSAClassification,
  classForPercent,
  rankForClass,
} from "../../../shared/utils/classification.js";

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

const scoresAgeAggr = async (memberNumber, division, maxScores) => {
  await Score.aggregate([
    { $match: { memberNumber, division } },
    {
      $project: {
        sd: true,
        _id: false,
      },
    },
    { $sort: { sd: -1 } },
    { $limit: maxScores },
    {
      $addFields: {
        diff: {
          $dateDiff: {
            startDate: "$$NOW",
            endDate: "$sd",
            unit: "day",
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        averageTime: { $avg: "$diff" },
      },
    },
  ]);
};

// TODO: move score calculation to reclassifications, so we don't rely on USPSA
// flags
export const scoresAge = async (division, memberNumber, maxScores = 4) => {
  const scoreDates = await Score.find({ memberNumber, division })
    .sort({ sd: -1 })
    .limit(maxScores)
    .select("sd")
    .lean();

  return scoreDates
    .map((c) => (new Date() - new Date(c.sd)) / (28 * 24 * 60 * 60 * 1000)) // millisecconds to 28-day "months"
    .reduce((acc, curV, unusedIndex, arr) => acc + curV / arr.length, 0);
};

// TODO: write up the schema once it's stable
const ShooterSchema = new Schema({}, { strict: false });
ShooterSchema.index({ memberNumber: 1, division: 1 });
ShooterSchema.index({ memberNumber: 1 });
ShooterSchema.index({ memberNumberDivision: 1 });
ShooterSchema.index({ memberId: 1 });

export const Shooter = mongoose.model("Shooter", ShooterSchema);

export const reduceByDiv = (classifications, valueFn) =>
  classifications.reduce(
    (acc, c) => ({
      ...acc,
      [divIdToShort[c.division_id]]: valueFn(c),
    }),
    {}
  );

// TODO: can I do lean here?
const allDivisionsScores = async (memberNumber) => {
  const query = Score.find({ memberNumber }).populate("HHFs").limit(0).sort({ sd: -1 });
  const data = await query;

  return data.map((doc) => doc.toObject({ virtuals: true }));
};

const reclassificationBreakdown = (reclassificationInfo, division) => ({
  current: reclassificationInfo?.[division]?.percent,
  currents: mapDivisions((div) => reclassificationInfo?.[div]?.percent),
  class: classForPercent(reclassificationInfo?.[division]?.percent),
  classes: mapDivisions((div) => classForPercent(reclassificationInfo?.[div]?.percent)),
});

export const hydrateShooters = async () => {
  console.log("hydrating shooters");
  await Shooter.collection.drop();
  console.time("shooters");
  await processImportAsync(
    "../../data/imported",
    /classification\.\d+\.json/,
    async ({ value: c }) => {
      const memberNumber = memberNumberFromMemberData(c.member_data);
      const memberScores = await allDivisionsScores(memberNumber);
      const ages = await mapDivisionsAsync((div) => scoresAge(div, memberNumber));
      const age1s = await mapDivisionsAsync((div) => scoresAge(div, memberNumber, 1));
      const hqClasses = reduceByDiv(c.classifications, (r) => r.class);
      const hqCurrents = reduceByDiv(c.classifications, (r) => Number(r.current_percent));
      const recalcByCurPercent = calculateUSPSAClassification(memberScores, "curPercent");
      const recalcByRecPercent = calculateUSPSAClassification(memberScores, "recPercent");

      process.stdout.write(".");
      return mapDivisionsAsync((division) => {
        const recalcDivCur = reclassificationBreakdown(recalcByCurPercent, division);
        const recalcDivRec = reclassificationBreakdown(recalcByRecPercent, division);

        const reclassificationsCurPercentCurrent = Number((recalcDivCur?.current ?? 0).toFixed(4));
        const reclassificationsRecPercentCurrent = Number((recalcDivRec?.current ?? 0).toFixed(4));

        const hqClass = hqClasses[division];
        const hqCurrent = hqCurrents[division];
        const hqToCurHHFPercent = hqCurrent - reclassificationsCurPercentCurrent;
        const hqToRecPercent = hqCurrent - reclassificationsRecPercentCurrent;

        //return Shooter.findOneAndUpdate(
        //  { memberNumber, division },
        // { upsert: true }
        return Shooter.create({
          data: c.member_data,
          memberId: c.member_data.member_id,
          memberNumber,
          name: [c.member_data.first_name, c.member_data.last_name, c.member_data.suffix]
            .filter(Boolean)
            .join(" "),

          hqClass,
          hqClassRank: rankForClass(hqClass),
          class: hqClass,
          classes: hqClasses,
          currents: hqCurrents,
          current: hqCurrent,

          // TODO: make ages part of the reclassification
          ages,
          age: ages[division],
          age1s,
          age1: age1s[division],

          reclassificationsCurPercentCurrent, // aka curHHFPercent
          reclassificationsRecPercentCurrent, // aka recPercent
          reclassifications: {
            curPercent: recalcDivCur,
            recPercent: recalcDivRec,
          },

          recClass: recalcDivRec.class,
          recClassRank: rankForClass(recalcDivRec.class),
          curHHFClass: recalcDivCur.class,
          curHHFClassRank: rankForClass(recalcDivCur.class),

          hqToCurHHFPercent,
          hqToRecPercent,
          division,
          memberNumberDivision: [memberNumber, division].join(":"),
        });
      });
    }
  );
  console.timeEnd("shooters");
};

const expiredShootersAggregate = [
  /*
  {
    $match: {
      division: "co",
      class: { $ne: "U" },
    },
  },*/
  {
    $group: {
      _id: "$memberNumber",
      expires: {
        $first: "$data.expiration_date",
      },
      dateDiff: {
        $first: {
          $dateDiff: {
            startDate: "$$NOW",
            endDate: {
              $dateFromString: {
                dateString: "$data.expiration_date",
              },
            },
            unit: "day",
          },
        },
      },
    },
  },
  // expired in last year
  {
    $match: {
      dateDiff: { $gte: -730, $lt: -365 },
    },
  },
  {
    $count: "count",
  },
];
