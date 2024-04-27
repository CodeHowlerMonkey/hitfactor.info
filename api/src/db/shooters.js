import mongoose, { Schema } from "mongoose";

import { loadJSON, processImportAsync, processImportAsyncSeq } from "../utils.js";
import {
  divIdToShort,
  forEachDivisionSeq,
  mapDivisions,
  mapDivisionsAsync,
} from "../dataUtil/divisions.js";
import {
  calculateUSPSAClassification,
  classForPercent,
  rankForClass,
} from "../../../shared/utils/classification.js";

import { Score } from "./scores.js";
import { Percent, PositiveOrMinus1 } from "../dataUtil/numbers.js";
import uniqBy from "lodash.uniqby";
import { percentAggregationOp } from "./utils.js";
import { dateSort } from "../../../shared/utils/sort.js";

const allPSTXTData = loadJSON("../../data/meta/all.json");
const missingShooterData = allPSTXTData.reduce((acc, cur) => {
  let curShooter = acc[cur.memberNumber] ?? [];
  curShooter.push(cur);
  acc[cur.memberNumber] = curShooter;
  return acc;
}, {});
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

// TODO: write up the schema once it's stable
const ShooterSchema = new Schema({}, { strict: false });
ShooterSchema.index({ memberNumber: 1, division: 1 });
ShooterSchema.index({ memberNumber: 1 });
ShooterSchema.index({ memberNumberDivision: 1 });
ShooterSchema.index({ memberId: 1 });
ShooterSchema.index({
  division: 1,
  reclassificationsRecPercentCurrent: -1,
  reclassificationsCurPercentCurrent: 1,
});

export const Shooter = mongoose.model("Shooter", ShooterSchema);

export const reduceByDiv = (classifications, valueFn) =>
  classifications.reduce(
    (acc, c) => ({
      ...acc,
      [divIdToShort[c.division_id]]: valueFn(c),
    }),
    {}
  );

export const testBrutalClassification = async (memberNumber) => {
  const scores = await allDivisionsScoresForBrutalClassification([memberNumber]);
  return calculateUSPSAClassification(scores, "recPercent");
};

const allDivisionsScores = async (memberNumbers) => {
  const query = Score.find({ memberNumber: { $in: memberNumbers } })
    .populate("HHFs")
    .limit(0)
    .sort({ sd: -1 });
  const data = await query;

  return data.map((doc) => doc.toObject({ virtuals: true }));
};

const allDivisionsScoresForBrutalClassification = async (memberNumbers) => {
  const [runs, majors] = await Promise.all([
    Score.aggregate([
      { $match: { memberNumber: { $in: memberNumbers }, hf: { $gt: 0 } } },
      {
        $project: {
          _id: false,
          hf: true,
          division: true,
          classifier: true,
          classifierDivision: true,
          sd: true,
          memberNumber: true,
        },
      },
      // use avg score for dupes and count them as one classifier in best 6 out of 10
      {
        $group: {
          _id: ["$classifier", "$division", "$memberNumber"],
          hf: { $avg: "$hf" },
          sd: { $first: "$sd" },
          memberNumber: { $first: "$memberNumber" },
          division: { $first: "$division" },
          classifier: { $first: "$classifier" },
          classifierDivision: { $first: "$classifierDivision" },
        },
      },
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          recHHF: "$HHFs.recHHF",
          curHHF: "$HHFs.curHHF",
          source: "Stage Score",
        },
      },
      {
        $addFields: {
          recPercent: percentAggregationOp("$hf", "$recHHF", 4),
          curPercent: percentAggregationOp("$hf", "$curHHF", 4),
        },
      },
      {
        $project: {
          _id: false,
          HHFs: false,
        },
      },
    ]),
    Score.find({ memberNumber: { $in: memberNumbers }, source: "Major Match" }).populate(
      "HHFs"
    ),
  ]);
  return [...runs, ...majors.map((m) => m.toObject({ virtuals: true }))];
};

const reclassificationBreakdown = (reclassificationInfo, division) => ({
  current: reclassificationInfo?.[division]?.percent,
  currents: mapDivisions((div) => reclassificationInfo?.[div]?.percent),
  class: classForPercent(reclassificationInfo?.[division]?.percent),
  classes: mapDivisions((div) => classForPercent(reclassificationInfo?.[div]?.percent)),
});

const shooterObjectsFromClassificationFile = async (c) => {
  if (!c?.member_data) {
    return [];
  }
  const memberNumber = memberNumberFromMemberData(c.member_data);
  const [memberScores, brutalMemberScores] = await Promise.all([
    allDivisionsScores([memberNumber]),
    allDivisionsScoresForBrutalClassification([memberNumber]),
  ]);
  const hqClasses = reduceByDiv(c.classifications, (r) => r.class);
  const hqCurrents = reduceByDiv(c.classifications, (r) => Number(r.current_percent));
  const recalcByCurPercent = calculateUSPSAClassification(memberScores, "curPercent");
  const recalcByRecPercent = calculateUSPSAClassification(memberScores, "recPercent");
  const recalcByBrutalPercent = calculateUSPSAClassification(
    brutalMemberScores.sort((a, b) => dateSort(a, b, "sd", -1)),
    "recPercent"
  );
  const ages = mapDivisions((div) => recalcByRecPercent?.[div]?.age);
  const age1s = mapDivisions((div) => recalcByRecPercent?.[div]?.age1);

  return Object.values(
    mapDivisions((division) => {
      const recalcDivCur = reclassificationBreakdown(recalcByCurPercent, division);
      const recalcDivRec = reclassificationBreakdown(recalcByRecPercent, division);
      const recalcDivBrutal = reclassificationBreakdown(recalcByBrutalPercent, division);

      const reclassificationsCurPercentCurrent = Number(
        (recalcDivCur?.current ?? 0).toFixed(4)
      );
      const reclassificationsRecPercentCurrent = Number(
        (recalcDivRec?.current ?? 0).toFixed(4)
      );
      const reclassificationsBrutalPercentCurrent = Number(
        (recalcDivBrutal?.current ?? 0).toFixed(4)
      );

      const hqClass = hqClasses[division];
      const hqCurrent = hqCurrents[division];
      const hqToCurHHFPercent = hqCurrent - reclassificationsCurPercentCurrent;
      const hqToRecPercent = hqCurrent - reclassificationsRecPercentCurrent;
      const hqToBrutalPercent = hqCurrent - reclassificationsBrutalPercentCurrent;

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
        classes: hqClasses,
        currents: hqCurrents,
        current: hqCurrent,

        ages,
        age: recalcByRecPercent?.[division]?.age,
        age1s,
        age1: recalcByRecPercent?.[division]?.age1,

        reclassificationsCurPercentCurrent, // aka curHHFPercent
        reclassificationsRecPercentCurrent, // aka recPercent
        reclassificationsBrutalPercentCurrent, // aka brutalPercent
        reclassifications: {
          curPercent: recalcDivCur,
          recPercent: recalcDivRec,
        },

        curHHFClass: recalcDivCur.class,
        curHHFClassRank: rankForClass(recalcDivCur.class),
        recClass: recalcDivRec.class,
        recClassRank: rankForClass(recalcDivRec.class),
        brutalClass: recalcDivBrutal.class,
        brutalClassRank: rankForClass(recalcDivBrutal.class),

        hqToCurHHFPercent,
        hqToRecPercent,
        hqToBrutalPercent,
        division,
        memberNumberDivision: [memberNumber, division].join(":"),
      };
    })
  );
};

const batchHydrateShooters = async (letter) => {
  process.stdout.write("\n");
  process.stdout.write(letter);
  process.stdout.write(": ");
  return processImportAsyncSeq(
    "../../data/imported",
    new RegExp(`classification\\.${letter}\\.\\d+\\.json`),
    async (obj) => {
      const curFileShooters = await shooterObjectsFromClassificationFile(obj.value);
      if (!curFileShooters.length) {
        return;
      }

      await Shooter.bulkWrite(
        curFileShooters.map((s) => ({
          updateOne: {
            filter: {
              memberNumber: s.memberNumber,
              division: s.division,
            },
            update: { $set: s },
            upsert: true,
          },
        }))
      );
      process.stdout.write(".");
    }
  );
};

export const hydrateShooters = async () => {
  console.log("hydrating shooters");
  console.time("shooters");

  await batchHydrateShooters("gm");
  await batchHydrateShooters("m");
  await batchHydrateShooters("a");
  await batchHydrateShooters("b");
  // TODO: CDU when they are imported

  console.timeEnd("shooters");
};

export const reclassifyShooters = async (shooters) => {
  try {
    const memberNumbers = uniqBy(shooters, (s) => s.memberNumber).map(
      (s) => s.memberNumber
    );
    const [scores, brutalScores] = await Promise.all([
      allDivisionsScores(memberNumbers),
      allDivisionsScoresForBrutalClassification(memberNumbers),
    ]);

    const scoresByMemberNumber = scores.reduce((acc, cur) => {
      let curMemberScores = acc[cur.memberNumber] ?? [];
      curMemberScores.push(cur);
      acc[cur.memberNumber] = curMemberScores;
      return acc;
    }, {});

    const brutalScoresByMemberNumber = brutalScores.reduce((acc, cur) => {
      let curMemberScores = acc[cur.memberNumber] ?? [];
      curMemberScores.push(cur);
      acc[cur.memberNumber] = curMemberScores;
      return acc;
    }, {});

    const updates = shooters
      .map(({ memberNumber, division }) => {
        const memberScores = scoresByMemberNumber[memberNumber];
        const brutalMemberScores = brutalScoresByMemberNumber[memberNumber];
        const recalcByCurPercent = calculateUSPSAClassification(
          memberScores,
          "curPercent"
        );
        const recalcByRecPercent = calculateUSPSAClassification(
          memberScores,
          "recPercent"
        );
        const recalcByBrutalPercent = calculateUSPSAClassification(
          brutalMemberScores.sort((a, b) => dateSort(a, b, "sd", -1)),
          "recPercent"
        );

        const recalcDivCur = reclassificationBreakdown(recalcByCurPercent, division);
        const recalcDivRec = reclassificationBreakdown(recalcByRecPercent, division);
        const recalcDivBrutal = reclassificationBreakdown(
          recalcByBrutalPercent,
          division
        );
        const ages = mapDivisions((div) => recalcByRecPercent?.[div]?.age);
        const age1s = mapDivisions((div) => recalcByRecPercent?.[div]?.age1);

        const reclassificationsCurPercentCurrent = Number(
          (recalcDivCur?.current ?? 0).toFixed(4)
        );
        const reclassificationsRecPercentCurrent = Number(
          (recalcDivRec?.current ?? 0).toFixed(4)
        );
        const reclassificationsBrutalPercentCurrent = Number(
          (recalcDivBrutal?.current ?? 0).toFixed(4)
        );

        const hqClass = missingShooterData[memberNumber]?.[division] || "U";

        return [
          {
            updateOne: {
              filter: { memberNumber, division },
              update: {
                $setOnInsert: {
                  memberNumber,
                  division,
                  memberNumberDivision: [memberNumber, division].join(":"),
                  memberId: missingShooterData[memberNumber]?.memberId,
                  hqClass,
                  hqClassRank: rankForClass(hqClass),
                  class: hqClass,
                  current: rankForClass(hqClass),
                  classes: mapDivisions(
                    (div) => missingShooterData[memberNumber]?.[div] || "U"
                  ),
                  currents: mapDivisions((div) =>
                    rankForClass(missingShooterData[memberNumber]?.[div] || "U")
                  ),
                  // TODO: name from the score?
                  //name: [c.member_data.first_name, c.member_data.last_name, c.member_data.suffix]
                  //  .filter(Boolean)
                  //  .join(" "),
                },
              },
            },
          },
          {
            updateOne: {
              filter: { memberNumber, division },
              update: [
                {
                  $set: {
                    ages,
                    age: recalcByRecPercent?.[division]?.age,
                    age1s,
                    age1: recalcByRecPercent?.[division]?.age1,

                    reclassificationsCurPercentCurrent, // aka curHHFPercent
                    reclassificationsRecPercentCurrent, // aka recPercent
                    reclassificationsBrutalPercentCurrent, // aka brutalPercent
                    reclassifications: {
                      curPercent: recalcDivCur,
                      recPercent: recalcDivRec,
                      brutalPercent: recalcDivBrutal,
                    },

                    recClass: recalcDivRec.class,
                    recClassRank: rankForClass(recalcDivRec.class),
                    brutalClass: recalcDivBrutal.class,
                    brutalClassRank: rankForClass(recalcDivBrutal.class),
                    curHHFClass: recalcDivCur.class,
                    curHHFClassRank: rankForClass(recalcDivCur.class),

                    hqToCurHHFPercent: {
                      $subtract: ["$current", reclassificationsCurPercentCurrent],
                    },
                    hqToRecPercent: {
                      $subtract: ["$current", reclassificationsRecPercentCurrent],
                    },
                    hqToBrutalPercent: {
                      $subtract: ["$current", reclassificationsBrutalPercentCurrent],
                    },
                  },
                },
              ],
              upsert: true,
            },
          },
        ];
      })
      .flat();
    await Shooter.bulkWrite(updates);
  } catch (error) {
    console.log("reclassifyShooters error:");
    console.log(error);
  }
};

export const reclassifySingleShooter = async (memberNumber, division) => {};

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
