/* eslint-disable no-console */
import uniqBy from "lodash.uniqby";
import mongoose, { Model, Schema } from "mongoose";

import {
  calculateUSPSAClassification,
  classForPercent,
  ClassificationMode,
  rankForClass,
} from "../../../shared/utils/classification";
import {
  divIdToShort,
  hfuDivisionCompatabilityMap,
  hfuDivisionsShortNamesThatNeedMinorHF,
  mapDivisions,
  uspsaDivShortNames,
} from "../dataUtil/divisions";
import { eloPointForShooter } from "../dataUtil/elo";
import { psClassUpdatesByMemberNumber } from "../dataUtil/uspsa";
import { loadJSON, processImportAsyncSeq } from "../utils";

import { Score, ScoreObjectWithVirtuals, Scores, ScoreVirtuals } from "./scores";
import { getField, percentAggregationOp } from "./utils";

const memberIdToNumberMap = loadJSON("../../data/meta/memberIdToNumber.json");
const memberNumberFromMemberData = memberData => {
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

// TODO: finish up the interfaces as schema
export interface Shooter {
  memberNumber: string;
  memberNumberDivision: string;
  name: string;
}

type ShooterModel = Model<Shooter, object>;
const ShooterSchema = new Schema<Shooter, ShooterModel>({}, { strict: false });
ShooterSchema.index({ memberNumber: 1, division: 1 });
ShooterSchema.index({ memberNumber: 1 });
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
  reclassificationsRecHHFOnlyPercentCurrent: -1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsRecHHFOnlyPercentCurrent: 1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsSoftPercentCurrent: -1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsSoftPercentCurrent: 1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsRecPercentUncappedCurrent: -1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsRecPercentUncappedCurrent: 1,
});

export const Shooters = mongoose.model("Shooters", ShooterSchema);

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
    const obj: ScoreObjectWithVirtuals = doc.toObject({ virtuals: true });
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

export const scoresForRecommendedClassification = memberNumbers =>
  Scores.aggregate([
    {
      $match: {
        bad: { $ne: true },
        memberNumber: { $in: memberNumbers },
        $or: [{ hf: { $gt: 0 } }, { percent: { $gt: 0 } }],
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
    ..._addHFUDivisions(),
    {
      $set: { classifierDivision: { $concat: ["$classifier", ":", "$division"] } },
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
    // limit up to 10 div/memberNumber unique scores before applying daily dupe.avg
    { $sort: { sd: -1, recPercent: -1 } },
    {
      $group: {
        _id: ["$classifier", "$division", "$memberNumber", "$sd"],
        docs: { $push: "$$ROOT" },
        sd: { $first: "$sd" },
        classifier: { $first: "$classifier" },
        division: { $first: "$division" },
        memberNumber: { $first: "$memberNumber" },
      },
    },
    {
      $group: {
        _id: ["$division", "$memberNumber"],
        divMemberScores: { $push: "$$ROOT" },
        sd: { $first: "$sd" },
      },
    },
    {
      $project: {
        divMemberScores: {
          $sortArray: { input: "$divMemberScores", sortBy: { sd: -1 } },
        },
      },
    },
    { $unwind: { path: "$divMemberScores" } },
    { $replaceRoot: { newRoot: "$divMemberScores" } },
    { $unwind: { path: "$docs" } },
    { $replaceRoot: { newRoot: "$docs" } },

    // use avg score for dupes within the day and count them as one classifier in best 6 out of 10
    {
      $group: {
        _id: ["$classifier", "$division", "$memberNumber", "$sd"],
        hf: { $avg: "$hf" },
        sd: { $first: "$sd" },
        memberNumber: { $first: "$memberNumber" },
        division: { $first: "$division" },
        classifier: { $first: "$classifier" },
        classifierDivision: { $first: "$classifierDivision" },
        percent: { $avg: "$percent" },
        curPercent: { $avg: "$curPercent" },
        recPercent: { $avg: "$recPercent" },
        source: { $first: "$source" },
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
  const scores = await scoresForRecommendedClassification(memberNumbers);
  return scores.reduce((acc, cur) => {
    const curMemberScores = acc[cur.memberNumber] ?? [];
    curMemberScores.push(cur);
    acc[cur.memberNumber] = curMemberScores;
    return acc;
  }, {});
};

const reclassificationBreakdown = (reclassificationInfo, division) => ({
  current: reclassificationInfo?.[division]?.percent,
  currents: mapDivisions(div => reclassificationInfo?.[div]?.percent),
  class: classForPercent(reclassificationInfo?.[division]?.percent),
  classes: mapDivisions(div => classForPercent(reclassificationInfo?.[div]?.percent)),
});

// upload from uspsa api
export const shooterObjectsFromClassificationFile = async c => {
  if (!c?.member_data) {
    return [];
  }
  const memberNumber = memberNumberFromMemberData(c.member_data);
  const recMemberScores = await scoresForRecommendedClassification([memberNumber]);
  const curMemberScores = await allDivisionsScores([memberNumber]);

  return shooterObjectsForMemberNumber(c, recMemberScores, curMemberScores);
};

// upload from uspsa api OR hydration from uspsa json files
const shooterObjectsForMemberNumber = (c, recMemberScores, curMemberScores) => {
  if (!c?.member_data) {
    return [];
  }
  const memberNumber = memberNumberFromMemberData(c.member_data);
  const hqClasses = reduceByDiv(c.classifications, r => r.class);
  const hqCurrents = reduceByDiv(c.classifications, r => Number(r.current_percent));
  const now = new Date();
  const recalcByCurPercent = calculateUSPSAClassification(
    curMemberScores,
    "curPercent",
    now,
    "uspsa",
    8,
  );
  const recalcByRecPercent = calculateUSPSAClassification(
    recMemberScores,
    "recPercent",
    now,
    "brutal",
    10,
  );

  return Object.values(
    mapDivisions(division => {
      const recalcDivCur = reclassificationBreakdown(recalcByCurPercent, division);
      const recalcDivRec = reclassificationBreakdown(recalcByRecPercent, division);

      const reclassificationsCurPercentCurrent = Number(
        (recalcDivCur?.current ?? 0).toFixed(4),
      );
      const reclassificationsRecPercentCurrent = Number(
        (recalcDivRec?.current ?? 0).toFixed(4),
      );

      const hqClass = hqClasses[division];
      const hqCurrent = hqCurrents[division];
      const hqToCurHHFPercent = hqCurrent - reclassificationsCurPercentCurrent;
      const hqToRecPercent = hqCurrent - reclassificationsRecPercentCurrent;

      return {
        data: c.member_data,
        memberId: c.member_data.member_id,
        memberNumber,
        name: [c.member_data.first_name, c.member_data.last_name, c.member_data.suffix]
          .filter(Boolean)
          .join(" "),

        hqClass,
        hqClassRank: rankForClass(hqClass),
        class: hqClass,
        current: hqCurrent,

        age: recalcByRecPercent?.[division]?.age,
        age1: recalcByRecPercent?.[division]?.age1,

        reclassificationsCurPercentCurrent, // aka curHHFPercent
        reclassificationsRecPercentCurrent, // aka recPercent

        curHHFClass: recalcDivCur.class,
        curHHFClassRank: rankForClass(recalcDivCur.class),
        recClass: recalcDivRec.class,
        recClassRank: rankForClass(recalcDivRec.class),

        hqToCurHHFPercent,
        hqToRecPercent,
        division,
        memberNumberDivision: [memberNumber, division].join(":"),
      };
    }),
  );
};

// hydration from uspsa json files
const processBatchHydrateShooters = async batchRaw => {
  const batch = batchRaw.filter(c => !!c?.member_data);
  const memberNumbers = batch.map(c => memberNumberFromMemberData(c.member_data));
  const [recScoresByMemberNumber, curScoresByMemberNumber] = await Promise.all([
    scoresForRecommendedClassificationByMemberNumber(memberNumbers),
    allDivisionsScoresByMemberNumber(memberNumbers),
  ]);

  const shooterObjects = batch
    .map(c => {
      const memberNumber = memberNumberFromMemberData(c.member_data);
      return shooterObjectsForMemberNumber(
        c,
        recScoresByMemberNumber[memberNumber],
        curScoresByMemberNumber[memberNumber],
      );
    })
    .flat();

  await Shooters.bulkWrite(
    shooterObjects.map(s => ({
      updateOne: {
        filter: {
          memberNumber: s.memberNumber,
          division: s.division,
        },
        update: { $set: s },
        upsert: true,
      },
    })),
  );
  process.stdout.write(".");
};

interface USPSAAPIClassificationBlob {
  id: string; // number in string
  division_id: string; // number in string
  division: string;
  class: "X" | "U" | "D" | "C" | "B" | "A" | "M" | "GM";
  current_percent: string; // number in string
  high_percent: string; // number in string
}

interface USPSAAPIClassificationResponse {
  value: {
    status: number;
    member_data: {
      member_id: string; // number in string
      member_number: string;
      first_name: string;
      middle_name: string;
      last_name: string;
      suffix: string;
      salutation: string;
      joined_date: string; // date in format: "1986-12-15 00:00:00";
      expiration_date: string; // date in format : "2024-12-02 00:00:00";
      life_member: string; // number 1 or 0 in string
      privacy: string; // number 1 or 0 in string
    };
    classifications: USPSAAPIClassificationBlob[];
  };
}

// hydration from uspsa json files
const batchHydrateShooters = async letter => {
  process.stdout.write("\n");
  process.stdout.write(letter);
  process.stdout.write(": ");

  let curBatch = [] as USPSAAPIClassificationResponse[];

  await processImportAsyncSeq(
    "../../data/imported",
    new RegExp(`classification\\.${letter}\\.\\d+\\.json`),
    async obj => {
      curBatch.push(obj.value as USPSAAPIClassificationResponse);
      if (curBatch.length >= 128) {
        await processBatchHydrateShooters(curBatch);
        curBatch = [];
      }
    },
  );

  // final batch that isn't big enough to be processed before
  if (curBatch.length) {
    await processBatchHydrateShooters(curBatch);
  }
};

export const hydrateShooters = async () => {
  console.log("hydrating shooters");
  console.time("shooters");

  await batchHydrateShooters("gm");
  await batchHydrateShooters("m");
  await batchHydrateShooters("a");
  await batchHydrateShooters("b");
  await batchHydrateShooters("c");
  await batchHydrateShooters("d");

  console.timeEnd("shooters");
};

export const reclassifyShooters = async shooters => {
  try {
    const memberNumbers = uniqBy(shooters, s => s.memberNumber).map(s => s.memberNumber);
    const [recScoresByMemberNumber, curScoresByMemberNumber, psClassUpdates] =
      await Promise.all([
        scoresForRecommendedClassificationByMemberNumber(memberNumbers),
        allDivisionsScoresByMemberNumber(memberNumbers),
        psClassUpdatesByMemberNumber(),
      ]);

    const updates = shooters
      .filter(
        ({ memberNumber, division }) =>
          // TODO: Implement Reclassify Shooters for SCSA
          // https://github.com/CodeHowlerMonkey/hitfactor.info/issues/69
          memberNumber && uspsaDivShortNames.find(x => x === division),
      )
      .map(({ memberNumber, division, name }) => {
        if (!memberNumber) {
          return [];
        }
        const recMemberScores = recScoresByMemberNumber[memberNumber];
        const curMemberScores = curScoresByMemberNumber[memberNumber];
        const now = new Date();
        const recalcByCurPercent = calculateUSPSAClassification(
          curMemberScores,
          "curPercent",
          now,
          "uspsa",
          8,
        );
        const recalcByRecHHFOnlyPercent = calculateUSPSAClassification(
          curMemberScores, // cur, not rec, to enable old D flag behavior
          "recPercent",
          now,
          "uspsa",
          10,
        );
        const recalcByRecPercentSoft = calculateUSPSAClassification(
          curMemberScores, // cur, not rec, to enable old D flag behavior
          "recPercent",
          now,
          "soft",
          10,
        );
        const recalcByRecPercent = calculateUSPSAClassification(
          recMemberScores,
          "recPercent",
          now,
          "brutal",
          10,
        );
        const recalcByRecPercentUncapped = calculateUSPSAClassification(
          recMemberScores,
          "recPercent",
          now,
          "brutal+uncapped",
          10,
        );

        const recalcDivCur = reclassificationBreakdown(recalcByCurPercent, division);
        const recalcDivRecHHFOnly = reclassificationBreakdown(
          recalcByRecHHFOnlyPercent,
          division,
        );
        const recalcDivSoft = reclassificationBreakdown(recalcByRecPercentSoft, division);
        const recalcDivRec = reclassificationBreakdown(recalcByRecPercent, division);
        const recalcDivRecUncapped = reclassificationBreakdown(
          recalcByRecPercentUncapped,
          division,
        );

        const reclassificationsCurPercentCurrent = Number(
          (recalcDivCur?.current ?? 0).toFixed(4),
        );
        const reclassificationsRecHHFOnlyPercentCurrent = Number(
          (recalcDivRecHHFOnly?.current ?? 0).toFixed(4),
        );
        const reclassificationsSoftPercentCurrent = Number(
          (recalcDivSoft?.current ?? 0).toFixed(4),
        );
        const reclassificationsRecPercentCurrent = Number(
          (recalcDivRec?.current ?? 0).toFixed(4),
        );
        const reclassificationsRecPercentUncappedCurrent = Number(
          (recalcDivRecUncapped?.current ?? 0).toFixed(4),
        );

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
                  current: rankForClass(hqClass),
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
                  ],
                },
                {
                  $set: {
                    hqClass,
                    hqClassRank: rankForClass(hqClass),
                    class: hqClass,
                    memberId: psClassUpdates?.[memberNumber]?.memberId,

                    age: recalcByRecPercent?.[division]?.age,
                    age1: recalcByRecPercent?.[division]?.age1,

                    elo: eloPointForShooter(division, memberNumber)?.rating,
                    reclassificationsCurPercentCurrent, // aka curHHFPercent
                    reclassificationsRecHHFOnlyPercentCurrent, //aka recHHFOnlyPercent
                    reclassificationsSoftPercentCurrent, //aka recSoftPercent
                    reclassificationsRecPercentCurrent, // aka recPercent
                    reclassificationsRecPercentUncappedCurrent, //aka recPercentUncapped

                    recClass: recalcDivRec.class,
                    recClassRank: rankForClass(recalcDivRec.class),
                    curHHFClass: recalcDivCur.class,
                    curHHFClassRank: rankForClass(recalcDivCur.class),
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
    console.log("reclassifyShooters error:");
    console.log(error);
  }
};

/** used for shooter's page chart / progression */
export const reclassificationForProgressMode = async (
  mode: ClassificationMode | "curPercent" | "recPercent",
  memberNumber: string,
) => {
  const classificationMode: ClassificationMode =
    mode === "curPercent" ? "uspsa" : mode === "recPercent" ? "brutal" : mode;

  const now = new Date();
  switch (classificationMode) {
    case "uspsa":
    case "uspsa+uncapped": {
      const scores = await allDivisionsScores([memberNumber]);
      return calculateUSPSAClassification(
        scores,
        "curPercent",
        now,
        classificationMode,
        8,
      );
    }

    case "soft":
    case "soft+uncapped":
    case "brutal":
    case "brutal+uncapped": {
      const scores = await scoresForRecommendedClassification([memberNumber]);
      return calculateUSPSAClassification(
        scores,
        "recPercent",
        now,
        classificationMode,
        10,
      );
    }
  }

  return null;
};
