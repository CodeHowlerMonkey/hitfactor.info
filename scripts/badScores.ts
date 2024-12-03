/* eslint-disable no-console */
import fs from "fs";

import { connect } from "../api/src/db/index";
import { Score, ScoreVirtuals, Scores } from "../api/src/db/scores";
import { percentAggregationOp } from "../api/src/db/utils";

type BadHundoScore = Score & ScoreVirtuals;

const go = async () => {
  await connect();

  const badHundos = await Scores.aggregate([
    {
      $project: {
        __v: false,
      },
    },
    {
      $match: {
        percent: { $gte: 100 },
        templateName: "USPSA",
      },
    },
    {
      $lookup: {
        from: "rechhfs",
        localField: "classifierDivision",
        foreignField: "classifierDivision",
        as: "rechhfs",
      },
    },
    {
      $addFields: {
        recHHF: {
          $getField: {
            input: { $arrayElemAt: ["$rechhfs", 0] },
            field: "recHHF",
          },
        },
        curHHF: {
          $getField: {
            input: { $arrayElemAt: ["$rechhfs", 0] },
            field: "curHHF",
          },
        },
      },
    },
    {
      $project: {
        rechhfs: false,
      },
    },
    {
      $addFields: {
        recPercent: percentAggregationOp("$hf", "$recHHF", 4),
        curPercent: percentAggregationOp("$hf", "$curHHF", 4),
      },
    },
    {
      $match: {
        recPercent: { $gte: 120 },
      },
    },
    {
      $sort: {
        recPercent: -1,
      },
    },
  ]);

  let full = "";
  badHundos.forEach(c => {
    const line = `${c.sd.toLocaleDateString()} - ${c.memberNumber} - ${c.division} - ${c.classifier} - HF ${c.hf} - ${c.recPercent}% rec - ${c.curPercent}% cur - ${c.clubid} - https://practiscore.com/results/new/${c.upload}`;
    full += line;
    full += "\n";
    console.log(line);
  });

  console.log(JSON.stringify(badHundos.length, null, 2));
  fs.writeFileSync(`./data/badHundos.json`, JSON.stringify(badHundos, null, 2));
  fs.writeFileSync(`./data/badHundos.txt`, full);

  const groupedByMemberNumber: Array<BadHundoScore | null> = Object.values(
    badHundos.reduce((acc: Record<string, BadHundoScore[]>, c) => {
      const curBucket: object[] = (acc[c.memberNumber] ??= []);
      curBucket.push(c);
      return acc;
    }, {}),
  )
    .sort((a, b) => b.length - a.length)
    .map(c => [c, null])
    .flat()
    .flat();
  fs.writeFileSync(
    `./data/badHundosByMember.txt`,
    groupedByMemberNumber.reduce((result: string, c: BadHundoScore | null) => {
      if (!c) {
        return `${result}\n`;
      }
      const line = `${c.sd.toLocaleDateString()} - ${c.memberNumber} - ${c.division} - ${c.classifier} - HF ${c.hf} - ${c.recPercent}% rec - ${c.curPercent}% cur - ${c.clubid} - https://practiscore.com/results/new/${c.upload}`;
      return `${result}\n${line}`;
    }, "") as string,
  );

  process.exit(0);
};

go();
