/* eslint-disable no-console */

import { connect } from "../../api/src/db";
import { Scores } from "../../api/src/db/scores";

const run = async () => {
  await connect();

  const r = await Scores.aggregate([
    {
      $match: { templateName: "USPSA" },
    },
    {
      $group: {
        _id: ["$classifier", "$memberNumber", "$sd", "$division"],
        memberNumber: { $first: "$memberNumber" },
        division: { $first: "$division" },
        classifier: { $first: "$classifier" },
        sd: { $first: "$sd" },
        upload: { $addToSet: "$upload" },
        samedayAttempts: { $sum: 1 },
      },
    },
    { $match: { samedayAttempts: { $gt: 1 } } },
    {
      $addFields: {
        memberNumber: { $toUpper: "$memberNumber" },
        samedayReshoots: { $subtract: ["$samedayAttempts", 1] },
      },
    },
    {
      $group: {
        _id: "$memberNumber",
        sd: { $addToSet: "$sd" },
        memberNumber: { $first: "$memberNumber" },
        classifier: { $addToSet: "$classifier" },
        upload: { $addToSet: "$upload" },
        divisions: { $addToSet: "$division" },
        reshoots: { $sum: "$samedayReshoots" },
      },
    },
    { $sort: { reshoots: -1 } },
    {
      $addFields: {
        upload: {
          $reduce: {
            input: "$upload",
            initialValue: [],
            in: {
              $concatArrays: ["$$value", "$$this"],
            },
          },
        },
      },
    },
  ]);

  console.log(JSON.stringify(r, null, 2));
  console.error("done");
  process.exit(0);
};

run();
