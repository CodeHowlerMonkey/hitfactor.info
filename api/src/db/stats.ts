/* eslint-disable no-console */
import mongoose from "mongoose";

import { Shooters } from "./shooters";

import { ClassificationLetters } from "../../../data/types/USPSA";
import { divShortNames, mapDivisions, uspsaDivShortNames } from "../dataUtil/divisions";

const StatsSchema = new mongoose.Schema({}, { strict: false });
export const Stats = mongoose.model("Stats", StatsSchema);

export const statsByDivision = async (field: string) => {
  const byDiv = mapDivisions(() => ({}));
  const dbResults = await Shooters.aggregate([
    {
      $match: {
        memberNumberDivision: { $exists: true },
        division: { $in: uspsaDivShortNames },
      },
    },
    {
      $project: {
        division: true,
        [field]: true,
        _id: false,
      },
    },
    {
      $addFields: {
        [field]: { $ifNull: [`$${field}`, "U"] },
      },
    },
    {
      $group: {
        _id: [`$${field}`, "$division"],
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

const classesRanked = ClassificationLetters;
export const statsByAll = async (field: string) => {
  const aggregateResult = await Shooters.aggregate([
    {
      $match: {
        memberNumberDivision: { $exists: true },
        division: { $in: uspsaDivShortNames },
      },
    },
    {
      $project: {
        _id: false,
        [field]: true,
        division: true,
        memberNumber: true,
      },
    },
    {
      $addFields: {
        [field]: { $ifNull: [`$${field}`, "U"] },
      },
    },
    {
      $addFields: {
        classRank: {
          $indexOfArray: [classesRanked, `$${field}`],
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
        maxClassRank: {
          $max: ["$maxClassRank", 0],
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

const statsByDivAndAll = async (field: string) => {
  const all = await statsByAll(field);
  const byDiv = await statsByDivision(field);

  return {
    all,
    ...byDiv,
  };
};

export const hydrateStats = async () => {
  console.log("hydrating stats");
  console.time("stats");
  const byCurrent = await statsByDivAndAll("recUncappedClassCurrent");
  const byHigh = await statsByDivAndAll("recUncappedClassHigh");
  const byHQCurrent = await statsByDivAndAll("classCurrent");
  const byHQHigh = await statsByDivAndAll("classHigh");

  await Stats.bulkWrite([
    {
      updateOne: {
        filter: {},
        upsert: true,
        update: [
          {
            $unset: [
              "byClass",
              "byPercent",
              "byCurHHFPercent",
              "byRecHHFPercent",
              "byRecHHFOnlyPercent",
              "byRecSoftPercent",
              "byRecUncappedPercent",
            ],
          },
          {
            $set: {
              byCurrent,
              byHigh,
              byHQCurrent,
              byHQHigh,
            },
          },
        ],
      },
    },
  ]);
  console.timeEnd("stats");
};
