import mongoose, { Schema } from "mongoose";

import { loadJSON, processImportAsync } from "../utils.js";
import { divIdToShort, mapDivisions, mapDivisionsAsync } from "../dataUtil/divisions.js";
import {
  calculateUSPSAClassification,
  classForPercent,
  rankForClass,
} from "../../../shared/utils/classification.js";

import { Score } from "./scores.js";
import { Percent, PositiveOrMinus1 } from "../dataUtil/numbers.js";
import uniqBy from "lodash.uniqby";

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
  const classifiers = await Score.aggregate([
    { $match: { memberNumber, hf: { $gt: 0 } } },
    {
      $project: {
        _id: false,
        hf: true,
        division: true,
        classifier: true,
        classifierDivision: true,
        sd: true,
      },
    },
    // use avg score for dupes and count them as one classifier in best 6 out of 10
    {
      $group: {
        _id: ["$classifier", "$division"],
        hf: { $avg: "$hf" },
        sd: { $first: "$sd" },
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
      $project: {
        _id: false,
        HHFs: false,
      },
    },
  ]);
  const runs = classifiers.map((d) => {
    d.curPercent = PositiveOrMinus1(Percent(d.hf, d.curHHF));
    d.recPercent = PositiveOrMinus1(Percent(d.hf, d.recHHF));
    return d;
  });
  const majors = (await Score.find({ memberNumber, source: "Major Match" }).populate("HHFs")).map(
    (m) => m.toObject({ virtuals: true })
  );

  return calculateUSPSAClassification([...runs, ...majors], "recPercent");
};

const allDivisionsScores = async (memberNumbers) => {
  const query = Score.find({ memberNumber: { $in: memberNumbers } })
    .populate("HHFs")
    .limit(0)
    .sort({ sd: -1 });
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
      // TODO: make hydration faster by bulk processing a file instead of a memberNumber
      const memberNumber = memberNumberFromMemberData(c.member_data);
      const memberScores = await allDivisionsScores([memberNumber]);
      const hqClasses = reduceByDiv(c.classifications, (r) => r.class);
      const hqCurrents = reduceByDiv(c.classifications, (r) => Number(r.current_percent));
      const recalcByCurPercent = calculateUSPSAClassification(memberScores, "curPercent");
      const recalcByRecPercent = calculateUSPSAClassification(memberScores, "recPercent");
      const ages = mapDivisions((div) => recalcByRecPercent?.[div]?.age);
      const age1s = mapDivisions((div) => recalcByRecPercent?.[div]?.age1);

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
        // { memberNumber, division },
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

          ages,
          age: recalcByRecPercent?.[division]?.age,
          age1s,
          age1: recalcByRecPercent?.[division]?.age1,

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

export const reclassifyShooters = async (shooters) => {
  try {
    const scores = await allDivisionsScores(
      uniqBy(shooters, (s) => s.memberNumber).map((s) => s.memberNumber)
    );

    const scoresByMemberNumber = scores.reduce((acc, cur) => {
      let curMemberScores = acc[cur.memberNumber] ?? [];
      curMemberScores.push(cur);
      acc[cur.memberNumber] = curMemberScores;
      return acc;
    }, {});

    const updates = shooters.map(({ memberNumber, division }) => {
      const memberScores = scoresByMemberNumber[memberNumber];
      const recalcByCurPercent = calculateUSPSAClassification(memberScores, "curPercent");
      const recalcByRecPercent = calculateUSPSAClassification(memberScores, "recPercent");

      const recalcDivCur = reclassificationBreakdown(recalcByCurPercent, division);
      const recalcDivRec = reclassificationBreakdown(recalcByRecPercent, division);
      const ages = mapDivisions((div) => recalcByRecPercent?.[div]?.age);
      const age1s = mapDivisions((div) => recalcByRecPercent?.[div]?.age1);

      const reclassificationsCurPercentCurrent = Number((recalcDivCur?.current ?? 0).toFixed(4));
      const reclassificationsRecPercentCurrent = Number((recalcDivRec?.current ?? 0).toFixed(4));

      return {
        updateOne: {
          filter: { memberNumber, division },
          update: {
            $setOnInsert: {
              memberNumber,
              division,
              memberNumberDivision: [memberNumber, division].join(":"),

              // data: c.member_data,
              // TODO: implement these from what data we have
              // memberId: c.member_data.member_id,
              //name: [c.member_data.first_name, c.member_data.last_name, c.member_data.suffix]
              //  .filter(Boolean)
              //  .join(" "),

              // hqClass,
              // hqClassRank: rankForClass(hqClass),
              // class: hqClass,
              // classes: hqClasses,
              // currents: hqCurrents,
              // current: hqCurrent,
            },
            $set: {
              ages,
              age: recalcByRecPercent?.[division]?.age,
              age1s,
              age1: recalcByRecPercent?.[division]?.age1,

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

              hqToCurHHFPercent: { $subtract: ["$hqCurrent", reclassificationsCurPercentCurrent] },
              hqToRecPercent: { $subtract: ["$hqCurrent", reclassificationsRecPercentCurrent] },
            },
          },
          upsert: true,
        },
      };
    });
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
