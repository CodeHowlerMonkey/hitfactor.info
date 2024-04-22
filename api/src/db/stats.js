import mongoose from "mongoose";
import { divShortNames, mapDivisions } from "../dataUtil/divisions.js";
import { Shooter } from "./shooters.js";

const StatsSchema = new mongoose.Schema({}, { strict: false });
export const Stats = mongoose.model("Stats", StatsSchema);

const addCurClassField = () => ({
  $addFields: {
    curClass: {
      $switch: {
        default: "U",
        branches: [
          {
            case: { $gte: ["$current", 95] },
            then: "GM",
          },
          {
            case: {
              $and: [{ $gte: ["$current", 85] }, { $lt: ["$current", 95] }],
            },
            then: "M",
          },
          {
            case: {
              $and: [{ $gte: ["$current", 75] }, { $lt: ["$current", 85] }],
            },
            then: "A",
          },
          {
            case: {
              $and: [{ $gte: ["$current", 60] }, { $lt: ["$current", 75] }],
            },
            then: "B",
          },
          {
            case: {
              $and: [{ $gte: ["$current", 40] }, { $lt: ["$current", 60] }],
            },
            then: "C",
          },
          {
            case: {
              $and: [{ $gte: ["$current", 0.01] }, { $lt: ["$current", 40] }],
            },
            then: "D",
          },
        ],
      },
    },
  },
});

export const statsByDivision = async (field) => {
  const byDiv = mapDivisions(() => ({}));
  const dbResults = await Shooter.aggregate([
    addCurClassField(),
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
    if (!divShortNames.includes(division)) {
      return;
    }

    try {
      byDiv[division][classLetter] = count;
    } catch (err) {
      console.error("error with stats:");
      console.error(division);
      console.error(classLetter);
      console.error(err);
    }
  });

  return byDiv;
};

const classesRanked = ["X", "U", "D", "C", "B", "A", "M", "GM"];
export const statsByAll = async (field) => {
  const aggregateResult = await Shooter.aggregate([
    addCurClassField(),
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
    {
      $group: {
        _id: null, // Grouping all documents into a single group
        allDocuments: { $addToSet: "$$ROOT" }, // Accumulating all documents into an array
      },
    },
    {
      $addFields: {
        allDocumentsReduced: {
          $reduce: {
            input: "$allDocuments",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                { $arrayToObject: [[["$$this._id", "$$this.count"]]] },
              ],
            },
          },
        },
      },
    },
    { $replaceRoot: { newRoot: "$allDocumentsReduced" } },
  ]);

  return aggregateResult[0];
};

const statsByDivAndAll = async (field) => {
  const all = await statsByAll(field);
  const byDiv = await statsByDivision(field);

  return {
    all,
    ...byDiv,
  };
};

const allDivs = ["opn", "ltd", "l10", "prod", "ss", "rev", "co", "lo", "pcc"];
const validClassifications = ["GM", "M", "A", "B", "C", "D"];
const hasClassification = (shooterObj, div) =>
  validClassifications.includes(shooterObj[div]);
const hasAnyClassification = (shooterObj) =>
  allDivs.some((div) => hasClassification(shooterObj, div));
const hasNoClassifications = (shooterObj) => !hasAnyClassification(shooterObj);

export const hydrateStats = async () => {
  console.log("hydrating stats");
  console.time("stats");
  const byClass = await statsByDivAndAll("class");
  const byPercent = await statsByDivAndAll("curClass");
  const byCurHHFPercent = await statsByDivAndAll("curHHFClass");
  const byRecHHFPercent = await statsByDivAndAll("recClass");
  const byBrutalPercent = await statsByDivAndAll("brutalClass");

  await Stats.collection.drop();
  await Stats.create({
    byClass,
    byPercent,
    byCurHHFPercent,
    byRecHHFPercent,
    byBrutalPercent,
  });
  console.timeEnd("stats");
};
