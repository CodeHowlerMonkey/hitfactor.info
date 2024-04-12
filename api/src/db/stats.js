import mongoose from "mongoose";
import {
  highestClassification,
  classForPercent,
} from "../../../shared/utils/classification.js";
import { mapDivisions } from "../dataUtil/divisions.js";
import { Shooter } from "./shooters.js";

const calculateCurrentClassifications = (memberCurPercentObj) =>
  mapDivisions((div) => {
    const curPercent = memberCurPercentObj[div];
    return classForPercent(curPercent);
  });

const selectClassificationsForDivision = (
  division,
  extMemberInfoObject,
  mode
) => {
  let classificationsObj = extMemberInfoObject.classifications;
  if (mode === "percent") {
    classificationsObj = calculateCurrentClassifications(
      extMemberInfoObject.current
    );
  } else if (mode === "curHHFPercent") {
    classificationsObj = calculateCurrentClassifications(
      mapDivisions(
        (div) =>
          extMemberInfoObject.reclassificationsByCurPercent?.[div]?.percent ?? 0
      )
    );
  } else if (mode === "recHHFPercent") {
    classificationsObj = calculateCurrentClassifications(
      mapDivisions(
        (div) =>
          extMemberInfoObject.reclassificationsByRecPercent?.[div]?.percent ?? 0
      )
    );
  }

  return division
    ? {
        [division]: classificationsObj[division],
      }
    : classificationsObj;
};

const getHighestClassificationCountsFor = (division, mode, shootersTable) => {
  const highestClassifications = shootersTable
    .map((cur) =>
      highestClassification(
        selectClassificationsForDivision(division, cur, mode)
      )
    )
    .filter(Boolean);
  const highestClassificationCounts = new Map();
  highestClassificationCounts.set("U", 0);
  highestClassificationCounts.set("D", 0);
  highestClassificationCounts.set("C", 0);
  highestClassificationCounts.set("B", 0);
  highestClassificationCounts.set("A", 0);
  highestClassificationCounts.set("M", 0);
  highestClassificationCounts.set("GM", 0);
  for (let cur of highestClassifications) {
    const curNum = highestClassificationCounts.get(cur) ?? 0;
    highestClassificationCounts.set(cur, curNum + 1);
  }
  return highestClassificationCounts;
};

const getDivisionClassBucket = (div, mode, shootersTable) => ({
  U: getHighestClassificationCountsFor(div, mode, shootersTable).get("U"),
  D: getHighestClassificationCountsFor(div, mode, shootersTable).get("D"),
  C: getHighestClassificationCountsFor(div, mode, shootersTable).get("C"),
  B: getHighestClassificationCountsFor(div, mode, shootersTable).get("B"),
  A: getHighestClassificationCountsFor(div, mode, shootersTable).get("A"),
  M: getHighestClassificationCountsFor(div, mode, shootersTable).get("M"),
  GM: getHighestClassificationCountsFor(div, mode, shootersTable).get("GM"),
});

const bucketBy = (byWhat, shootersTable) => ({
  all: getDivisionClassBucket(undefined, byWhat, shootersTable),
  ...mapDivisions((div) => getDivisionClassBucket(div, byWhat, shootersTable)),
  Approx: {
    U: 0,
    D: 19,
    C: 42,
    B: 25,
    A: 8,
    M: 5,
    GM: 1,
  },
});

const StatsSchema = new mongoose.Schema({}, { strict: false });
export const Stats = mongoose.model("Stats", StatsSchema);

export const statsByDivision = async (field) => {
  const byDiv = mapDivisions(() => ({}));
  const dbResults = await Shooter.aggregate([
    {
      $project: {
        division: true,
        [field]: true,
        _id: false,
      },
    },
    {
      $group: {
        _id: ["$" + field, "$division"],
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  dbResults.forEach(({ _id: [classLetter, division], count }) => {
    byDiv[division][classLetter] = count;
  });

  return byDiv;
};

const classesRanked = ["X", "U", "D", "C", "B", "A", "M", "GM"];
export const statsByAll = async (field) => {
  return Shooter.aggregate([
    {
      $project: {
        _id: false,
        [field]: true,
        memberNumber: true,
      },
    },
    {
      $addFields: {
        classRank: {
          $indexOfArray: [classesRanked, "$" + field],
        },
      },
    },
    {
      $group: {
        _id: "$memberNumber",
        maxClassRank: {
          $max: "$classRank",
        },
      },
    },
    {
      $addFields: {
        maxClass: {
          $arrayElemAt: [classesRanked, "$maxClassRank"],
        },
      },
    },
    {
      $group: {
        _id: "$maxClass",
        count: { $sum: 1 },
      },
    },
  ]);
};

export const hydrateStats = async () => {
  console.log("hydrating stats");
  await Stats.collection.drop();
  console.time("stats");
  const shootersTable = await Shooter.find({}).lean().limit(0);
  const stats = {
    byClass: bucketBy("class", shootersTable),
    byPercent: bucketBy("percent", shootersTable),
    byCurHHFPercent: bucketBy("curHHFPercent", shootersTable),
    byRecHHFPercent: bucketBy("recHHFPercent", shootersTable),
  };

  await Stats.create(stats);
  console.timeEnd("stats");
};
