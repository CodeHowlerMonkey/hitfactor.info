/* eslint-disable no-console */
import uniqBy from "lodash.uniqby";
import mongoose, { Model, Schema } from "mongoose";
import { v4 as randomUUID } from "uuid";

import { ScoreObjectWithVirtuals, Scores } from "@api/db/scores";
import { percentAggregationOp } from "@api/db/utils";
import { Shooter } from "@data/types/Shooter";
import {
  classForPercent,
  ClassLetter,
  percentForClass,
} from "@shared/classification/brackets";
import { ClassificationState, PercentWithDate } from "@shared/classification/state";

import { scoresForMode } from "./matchScores";

import { calculateUSPSAClassification } from "../../../shared/classification/engine";
import { classificationDifficulty } from "../../../shared/constants/difficulty";
import { divIdToShort, uspsaDivShortNames } from "../dataUtil/divisions";
import { eloPointForShooter } from "../dataUtil/elo";
import { psClassUpdatesByMemberNumber } from "../dataUtil/uspsa";

export { type Shooter } from "@data/types/Shooter";

type ShooterModel = Model<Shooter, object>;
const ShooterSchema = new Schema<Shooter, ShooterModel>({}, { strict: false });
ShooterSchema.index({ memberNumber: 1, division: 1 });
ShooterSchema.index({ memberNumberDivision: 1 });
ShooterSchema.index({ memberId: 1 });
ShooterSchema.index({
  division: 1,
  reclassificationsRecPercentCurrent: -1,
  reclassificationsCurPercentCurrent: 1,
});
ShooterSchema.index({
  class: 1,
  division: 1,
  reclassificationsRecPercentCurrent: -1,
  reclassificationsCurPercentCurrent: 1,
});
ShooterSchema.index({
  class: 1,
  division: 1,
  hqToRecPercent: 1,
  reclassificationsCurPercentCurrent: 1,
});
ShooterSchema.index({
  class: 1,
  division: 1,
  reclassificationsCurPercentCurrent: 1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsRecPercentUncappedCurrent: -1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsMajorsCurrent: -1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsMajorsCurrent: 1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsClassifiersCurrent: -1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsClassifiersCurrent: 1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsRecPercentUncappedCurrent: 1,
  ageMaxDate: 1,
});

export const Shooters =
  mongoose.models.Shooters || mongoose.model("Shooters", ShooterSchema);

export const reduceByDiv = (classifications, valueFn) =>
  classifications.reduce(
    (acc, c) => ({
      ...acc,
      [divIdToShort[c.division_id]]: valueFn(c),
    }),
    {},
  );

/**
 * Selects all scores of multiple shooters (all divisions).
 * Used for reclassification (HQ alg makes divisions cross-dependent for C flag)
 */
export const allDivisionsScores = async memberNumbers => {
  const query = Scores.find({
    memberNumber: { $in: memberNumbers },
    bad: { $ne: true },
  })
    .populate("HHFs")
    .limit(0)
    .sort({ sd: -1 });
  const data = await query;

  return data.map(doc => {
    const obj: ScoreObjectWithVirtuals = doc.toObject<ScoreObjectWithVirtuals>({
      virtuals: true,
    });
    const classifier = obj.isMajor ? obj._id : obj.classifier;
    const classifierDivision = `${classifier}:${obj.division}`;
    return { ...obj, classifier, classifierDivision };
  });
};

export const allDivisionsScoresByMemberNumber = async memberNumbers => {
  const scores = await allDivisionsScores(memberNumbers);
  return scores.reduce((acc, cur) => {
    const curMemberScores = acc[cur.memberNumber] ?? [];
    curMemberScores.push(cur);
    acc[cur.memberNumber] = curMemberScores;
    return acc;
  }, {});
};

/*
const _divisionExplosion = () => [
  {
    $set: {
      hfuDivisionCompatabilityMap: { $objectToArray: hfuDivisionCompatabilityMap },
    },
  },
  {
    $set: {
      division: [
        "$division",
        getField({ input: "$hfuDivisionCompatabilityMap", field: "$division" }),
      ],
    },
  },
  { $unwind: { path: "$division" } },
  { $match: { division: { $ne: null } } }, // easier to unmatch than to filter lol
  { $unset: "hfuDivisionCompatabilityMap" },
];

// duplicates non-hfu-division scores, adding hfu-division scores
const _addHFUDivisions = () => [
  ..._divisionExplosion(),
  {
    $match: {
      $or: [
        { division: { $nin: hfuDivisionsShortNamesThatNeedMinorHF } },
        { minorHF: { $gt: 0 } },
      ],
    },
  },
  {
    $set: {
      hf: {
        $cond: {
          if: { $in: ["$division", hfuDivisionsShortNamesThatNeedMinorHF] },
          then: "$minorHF",
          else: "$hf",
        },
      },
    },
  },
];
*/

/** Replaces same day dupes with a single average run in memory */
export const dedupeGrandbagging = (scores: ScoreObjectWithVirtuals[]) =>
  Object.values(
    scores.reduce(
      (acc, cur) => {
        cur.classifier = cur.classifier || randomUUID();
        const date = new Date(cur.sd).toLocaleDateString();
        const key = [date, cur.classifier].join(":");
        acc[key] = acc[key] || [];
        acc[key].push(cur);
        return acc;
      },
      {} as Record<string, ScoreObjectWithVirtuals[]>,
    ),
  ).map(oneDayScores => {
    if (oneDayScores.length === 1) {
      return oneDayScores[0];
    }

    const avgHf =
      oneDayScores.reduce((acc, cur) => acc + cur.hf, 0) / oneDayScores.length;
    const avgRecPercent =
      oneDayScores.reduce((acc, cur) => acc + cur.recPercent, 0) / oneDayScores.length;

    return { ...oneDayScores[0], hf: avgHf, recPercent: avgRecPercent };
  });

interface ScoresFilter {
  memberNumbers: string[];
  division?: string | { $in: string[] };
  until?: Date;
}

interface ScoresOptions {
  includeZeros?: boolean;
}

export const scoresForRecommendedClassification = (
  { memberNumbers, division, until }: ScoresFilter,
  opts?: ScoresOptions,
) =>
  Scores.aggregate([
    {
      $match: {
        bad: { $ne: true },
        source: { $ne: "Major Match" }, // majors only come from MatchScores now
        memberNumber: { $in: memberNumbers },
        ...(opts?.includeZeros ? {} : { hf: { $gt: 0 } }),

        // optional filtering
        ...(!division ? {} : { division }),
        ...(!until ? {} : { sd: { $lt: until } }),
      },
    },
    {
      $project: {
        hf: true,
        minorHF: true,
        division: true,
        classifier: true,
        classifierDivision: true,
        sd: true,
        memberNumber: true,
        percent: true,
        source: true,
      },
    },
    // ensure classifier and classifierDivision fields for Majors
    {
      $set: {
        classifier: {
          $cond: {
            if: { $eq: ["$source", "Major Match"] },
            then: { $toString: "$_id" },
            else: { $ifNull: ["$classifier", { $toString: "$_id" }] },
          },
        },
      },
    },
    // calculate recPercent before sorting/deduping, so we can use it as secondary sort
    {
      $lookup: {
        from: "rechhfs",
        localField: "classifierDivision",
        foreignField: "classifierDivision",
        as: "HHFs",
      },
    },
    {
      $unwind: {
        path: "$HHFs",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        recHHF: "$HHFs.recHHF",
        curHHF: "$HHFs.curHHF",
      },
    },
    {
      $addFields: {
        recPercent: {
          $cond: {
            if: { $eq: ["$source", "Major Match"] },
            then: "$percent",
            else: percentAggregationOp("$hf", "$recHHF", 4),
          },
        },
        curPercent: {
          $cond: {
            if: { $eq: ["$source", "Major Match"] },
            then: "$percent",
            else: percentAggregationOp("$hf", "$curHHF", 4),
          },
        },
      },
    },
    {
      $project: {
        _id: false,
        HHFs: false,
      },
    },
    { $sort: { sd: -1, recPercent: -1 } },
  ]);

export const scoresForRecommendedClassificationByMemberNumber = async memberNumbers => {
  const scores = await scoresForMode({ mode: "combined", memberNumbers });
  return scores.reduce((acc, cur) => {
    const curMemberScores = acc[cur.memberNumber] ?? [];
    curMemberScores.push(cur);
    acc[cur.memberNumber] = curMemberScores;
    return acc;
  }, {});
};

interface ReclassificationBreakdownResult {
  current: number;
  high: number;
  classCurrent: ClassLetter;
  classHigh: ClassLetter;
  age: number;
  age1: number;
  ageMax: number;
  history: PercentWithDate[];
  //effectiveWindow: ClassifierScore[];
  age1Date?: Date;
  ageMaxDate?: Date;
}
const reclassificationBreakdown = (
  reclassificationInfo: ClassificationState,
  division: string,
): ReclassificationBreakdownResult => ({
  current: Number((reclassificationInfo?.[division]?.percent ?? 0).toFixed(4)),
  high: Number((reclassificationInfo?.[division]?.highPercent ?? 0).toFixed(4)),
  classCurrent: classForPercent(reclassificationInfo?.[division]?.percent),
  classHigh: classForPercent(reclassificationInfo?.[division]?.highPercent),
  age: reclassificationInfo?.[division]?.age,
  age1: reclassificationInfo?.[division]?.age1,
  ageMax: reclassificationInfo?.[division]?.ageMax,
  history: reclassificationInfo?.[division]?.percentWithDates,
  //effectiveWindow: reclassificationInfo?.[division]?.effectiveWindow,
  age1Date: reclassificationInfo?.[division]?.age1Date,
  ageMaxDate: reclassificationInfo?.[division]?.ageMaxDate,
});

const recalc = (scores, date: Date, division: string) =>
  reclassificationBreakdown(
    calculateUSPSAClassification(
      scores.map(cur => ({ ...cur, percent: cur.recPercent })),
      date,
      classificationDifficulty.window.min,
      classificationDifficulty.window.best,
      classificationDifficulty.window.recent,
      classificationDifficulty.percentCap,
    ),
    division,
  );

export const reclassifyShooters = async shooters => {
  try {
    const now = new Date();
    const memberNumbers = uniqBy(shooters, s => s.memberNumber).map(s => s.memberNumber);
    const [recScoresByMemberNumber, psClassUpdates] = await Promise.all([
      scoresForRecommendedClassificationByMemberNumber(memberNumbers),
      psClassUpdatesByMemberNumber(),
    ]);

    const updates = shooters
      .filter(
        ({ memberNumber, division }) =>
          memberNumber && uspsaDivShortNames.find(x => x === division),
      )
      .map(({ memberNumber, division, name }) => {
        if (!memberNumber) {
          return [];
        }
        const recScores = recScoresByMemberNumber[memberNumber] || [];
        const recalcDivRec = recalc(recScores, now, division);

        const majorMatchScores = recScores.filter(s => s.source === "Major Match");
        const recalcMajors = recalc(majorMatchScores, now, division);

        const classifierScores = recScores.filter(s => s.source !== "Major Match");
        const recalcClassifiers = recalc(classifierScores, now, division);

        const hqClass = psClassUpdates?.[memberNumber]?.[division] || "U";

        return [
          {
            updateOne: {
              filter: { memberNumber, division },
              update: {
                $setOnInsert: {
                  name,
                  memberNumber,
                  division,
                  memberNumberDivision: [memberNumber, division].join(":"),
                  current: percentForClass(hqClass),
                },
              },
              upsert: true,
            },
          },
          {
            updateOne: {
              filter: { memberNumber, division },
              update: [
                {
                  $unset: [
                    "reclassifications",
                    "ages",
                    "age1s",
                    "classes",
                    "currents",
                    "reclassificationsBrutalPercentCurrent",
                    "hqToBrutalPercent",
                    "hqToCurHHFPercent",
                    "hqToRecPercent",
                    "reclassificationsCurPercentCurrent",
                    "reclassificationsRecPercentCurrent",
                    "curHHFClass",
                    "curHHFClassRank",
                    "recClass",
                    "recClassRank",
                    "brutalClass",
                    "brutalClassRank",
                    "reclassificationsRecHHFOnlyPercentCurrent",
                    "reclassificationsSoftPercentCurrent",
                    "recHHFOnlyClass",
                    "recHHFOnlyClassRank",
                    "recSoftClass",
                    "recSoftClassRank",
                    "recUncappedClass",
                    "recUncappedClassRank",
                    "reclassificationsCurPercentHigh",
                    "reclassificationsRecHHFOnlyPercentHigh",
                    "reclassificationsSoftPercentHigh",
                    "reclassificationsRecPercentHigh",
                    "benefit",
                    "benefitHigh",
                  ],
                },
                {
                  $set: {
                    hqClass,
                    hqClassRank: percentForClass(hqClass),
                    class: hqClass,
                    memberId: psClassUpdates?.[memberNumber]?.memberId,
                    memberNumberDivision: [memberNumber, division].join(":"),

                    age: recalcDivRec?.age,
                    age1: recalcDivRec?.age1,
                    ageMax: recalcDivRec?.ageMax,
                    age1Date: recalcDivRec?.age1Date,
                    ageMaxDate: recalcDivRec?.ageMaxDate,

                    elo: eloPointForShooter(division, memberNumber)?.rating,
                    reclassificationsRecPercentUncappedCurrent: recalcDivRec.current, //aka recPercentUncapped
                    reclassificationsRecPercentUncappedHigh: recalcDivRec.high, // aka recPercentUncappedHigh

                    reclassificationsMajorsCurrent: recalcMajors.current,
                    reclassificationsClassifiersCurrent: recalcClassifiers.current,

                    reclassificationsRecPercentHistory: recalcDivRec.history,
                    reclassificationsMajorsHistory: recalcMajors.history,
                    reclassificationsClassifiersHistory: recalcClassifiers.history,

                    recUncappedClassCurrent: recalcDivRec.classCurrent,
                    recUncappedClassCurrentRank: percentForClass(
                      recalcDivRec.classCurrent,
                    ),

                    recUncappedClassHigh: recalcDivRec.classHigh,
                    recUncappedClassHighRank: percentForClass(recalcDivRec.classHigh),
                  },
                },
              ],
              upsert: true,
            },
          },
        ];
      })
      .flat();
    return Shooters.bulkWrite(updates.filter(Boolean));
  } catch (error) {
    console.log("reclassifyShooters error:");
    console.log(error);
  }
};

export const reEloShooters = async shooters => {
  try {
    const updates = shooters
      .filter(
        ({ memberNumber, division }) =>
          memberNumber && uspsaDivShortNames.find(x => x === division),
      )
      .map(({ memberNumber, division }) => {
        if (!memberNumber) {
          return [];
        }

        return [
          {
            updateOne: {
              filter: { memberNumber, division },
              update: [
                {
                  $set: {
                    elo: eloPointForShooter(division, memberNumber)?.rating,
                  },
                },
              ],
              upsert: true,
            },
          },
        ];
      })
      .flat();
    await Shooters.bulkWrite(updates.filter(Boolean));
  } catch (error) {
    console.log("reEloShooters error:");
    console.log(error);
  }
};
