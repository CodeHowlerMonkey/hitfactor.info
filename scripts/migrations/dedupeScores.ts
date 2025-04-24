/* eslint-disable no-console */

import { connect } from "../../api/src/db";
import { Scores } from "../../api/src/db/scores";

const dedupe = async () => {
  await connect();

  const scoresGrouped = await Scores.aggregate([
    {
      $group: {
        _id: ["$memberNumberDivision", "$classifierDivision", "$hf", "$sd"],
        scores: {
          $push: "$$ROOT",
        },
      },
    },
    {
      $match: {
        $expr: {
          $gt: [
            {
              $size: "$scores",
            },
            1,
          ],
        },
      },
    },
  ]);

  const scoresToRemove = scoresGrouped
    .map(o => {
      const curGroup = o.scores.reverse();
      // prefer to keep PS-uploaded scores
      const psScoreIndex = curGroup.findIndex(s => !!s.upload);
      if (psScoreIndex) {
        curGroup.splice(psScoreIndex, 1);
        return curGroup;
      }

      return curGroup.slice(1);
    })
    .flat();
  console.log(`to remove = ${scoresToRemove.length}`);

  const result = await Scores.deleteMany({
    _id: { $in: scoresToRemove.map(s => s._id) },
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
};

dedupe();
