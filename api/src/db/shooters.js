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
          (await Score.find({ memberNumber }).limit(0))
            .sort({ sd: -1 })
            .map((doc) => doc.toObject({ virtuals: true })),
          "curPercent"
        ),
        reclassificationsByRecPercent: calculateUSPSAClassification(
          (await Score.find({ memberNumber }).limit(0)).map((doc) =>
            doc.toObject({ virtuals: true })
          ),
          "recPercent"
        ),
        ages: await mapDivisionsAsync((div) => scoresAge(div, memberNumber)),
        age1s: await mapDivisionsAsync((div) =>
          scoresAge(div, memberNumber, 1)
        ),
      };

      process.stdout.write(".");
      return mapDivisionsAsync((div) =>
        Shooter.create(divisionShooterAdapter(shooterDoc, div))
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
      hqClass,
      curHHFClass: reclassificationsCurPercent.class,
      recClass: reclassificationsRecPercent.class,
      hqClassRank: rankForClass(hqClass),
      curHHFClassRank: rankForClass(reclassificationsCurPercent.class),
      recClassRank: rankForClass(reclassificationsRecPercent.class),
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
    class: "X",
    high: 0,
    current: 0,
    division,
    name: "Expired / Not Found",
  };
};

const addRankAndPercentile = (collection, field) =>
  collection
    .sort(safeNumSort(field)) // sort by high to calculate highRank
    .map((c, index, all) => ({
      ...c,
      [`${field}Rank`]: index,
      [`${field}Percentile`]: Percent(index, all.length),
    }));

export const legacyShootersExtendedAdapter = (shooters, division) => {
  const withBreakDown = shooters.map((c) =>
    classificationsBreakdownAdapter(c, division)
  );
  const withHigh = addRankAndPercentile(withBreakDown, "high");
  const withCurrent = addRankAndPercentile(withHigh, "current");

  return withCurrent.map((c) => {
    // TODO: move age calculation to calculateUSPSAClassification
    // should be cheaper and more precise for curHHF/recHHF modes
    c.age = c.ages[division];
    c.age1 = c.age1s[division];
    // c.ages = c.ages
    return c;
  });
};

export const divisionShooterAdapter = (shooter, division) => {
  return {
    ...shooter,
    ...classificationsBreakdownAdapter(shooter, division),
    age: shooter.ages[division],
    age1: shooter.age1s[division],
    division,
  };
};

export const shootersExtendedInfoForDivision = async ({
  division,
  memberNumber,
}) => {
  const query = Shooter.where({
    division,
    reclassificationsCurPercentCurrent: { $gt: 0 },
  });
  if (memberNumber) {
    query.where({ memberNumber });
  }

  const shooters = await query.lean().limit(0).exec();
  return legacyShootersExtendedAdapter(shooters, division);
};
