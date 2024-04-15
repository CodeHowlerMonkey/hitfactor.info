import mongoose, { Schema } from "mongoose";

import { loadJSON, processImportAsync } from "../utils.js";
import {
  divIdToShort,
  mapDivisions,
  mapDivisionsAsync,
} from "../dataUtil/divisions.js";
import { Percent } from "../dataUtil/numbers.js";
import {
  calculateUSPSAClassification,
  classForPercent,
  rankForClass,
} from "../../../shared/utils/classification.js";
import { safeNumSort } from "../../../shared/utils/sort.js";

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
  class: String,
  percent: Number,
  highPecent: Number,
  percentWithDates: [{ p: Number, sd: Date }],
});

const OldShooterSchema = new Schema(
  {
    memberId: String,
    memberNumber: String, // TODO: try unique on that and Id + division
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
  const query = Score.find({ memberNumber }).limit(0).sort({ sd: -1 });
  const data = await query;

  return data.map((doc) => doc.toObject({ virtuals: true }));
};

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
        classifications: reduceByDiv(c.classifications, (r) => r.class),
        high: reduceByDiv(c.classifications, (r) => Number(c.high_percent)),
        current: reduceByDiv(c.classifications, (r) =>
          Number(c.current_percent)
        ),
        reclassificationsByCurPercent: calculateUSPSAClassification(
          memberScores,
          "curPercent"
        ),
        reclassificationsByRecPercent: calculateUSPSAClassification(
          memberScores,
          "recPercent"
        ),
        ages: await mapDivisionsAsync((div) => scoresAge(div, memberNumber)),
        age1s: await mapDivisionsAsync((div) =>
          scoresAge(div, memberNumber, 1)
        ),
      };

      process.stdout.write(".");
      return mapDivisionsAsync((division) =>
        Shooter.create({
          ...shooterDoc,
          ...classificationsBreakdownAdapter(shooterDoc, division),
          age: shooterDoc.ages[division],
          age1: shooterDoc.age1s[division],
          division,
          memberNumberDivision: [shooterDoc.memberNumber, division].join(":"),
        })
      );
    }
  );
  console.timeEnd("shooters");
};

const reclassificationBreakdown = (reclassificationInfo, division) => {
  const high = reclassificationInfo?.[division]?.highPercent;
  const current = reclassificationInfo?.[division]?.percent;
  return {
    class: classForPercent(current),
    classes: mapDivisions((div) =>
      classForPercent(reclassificationInfo?.[div]?.percent)
    ),
    highClass: classForPercent(high),
    highClasses: mapDivisions((div) =>
      classForPercent(reclassificationInfo?.[div]?.highPercent)
    ),
    high,
    current: reclassificationInfo?.[division]?.percent,
    highs: mapDivisions((div) => reclassificationInfo?.[div]?.highPercent),
    currents: mapDivisions((div) => reclassificationInfo?.[div]?.percent),
  };
};

const classificationsBreakdownAdapter = (c, division) => {
  const {
    classifications,
    reclassificationsByCurPercent,
    reclassificationsByRecPercent,
    high,
    current,
    currents,
    ...etc
  } = c;
  try {
    const reclassificationsCurPercent = reclassificationBreakdown(
      reclassificationsByCurPercent,
      division
    );
    const reclassificationsRecPercent = reclassificationBreakdown(
      reclassificationsByRecPercent,
      division
    );

    const reclassificationsCurPercentCurrent = Number(
      (reclassificationsCurPercent?.current ?? 0).toFixed(4)
    );
    const reclassificationsRecPercentCurrent = Number(
      (reclassificationsRecPercent?.current ?? 0).toFixed(4)
    );

    const hqClass = classifications?.[division];
    const hqCurrent = current?.[division];
    const hqToCurHHFPercent = hqCurrent - reclassificationsCurPercentCurrent;
    const hqToRecPercent = hqCurrent - reclassificationsRecPercentCurrent;

    return {
      ...etc,
      class: classifications?.[division],
      classes: classifications,
      high: high?.[division],
      current: hqCurrent,
      highs: high,
      currents: current,
      // needs to be not-deep for sort
      reclassificationsCurPercentCurrent,
      reclassificationsRecPercentCurrent,
      reclassificationChange:
        reclassificationsRecPercentCurrent - reclassificationsCurPercentCurrent,
      reclassifications: {
        curPercent: reclassificationsCurPercent,
        recPercent: reclassificationsRecPercent,
      },

      recClass: reclassificationsRecPercent.class,
      recClassRank: rankForClass(reclassificationsRecPercent.class),
      hqClass,
      hqClassRank: rankForClass(hqClass),
      curHHFClass: reclassificationsCurPercent.class,
      curHHFClassRank: rankForClass(reclassificationsCurPercent.class),

      hqToCurHHFPercent,
      hqToRecPercent,
      division,
    };
  } catch (err) {
    console.log(err);
    console.log(division);
  }

  return {
    ...c,
    error: true,
    class: "X",
    high: 0,
    current: 0,
    division,
    name: "Expired / Not Found",
  };
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
