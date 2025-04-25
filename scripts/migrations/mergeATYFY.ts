/* eslint-disable no-console */

import { connect } from "../../api/src/db";
import { MatchScores } from "../../api/src/db/matchScores";
import { Scores } from "../../api/src/db/scores";
import { Shooters } from "../../api/src/db/shooters";

/**
 * Migrates shooters & scores with A/TY/FY memberNumbers to last memberNumber they had historically.
 *
 * Updates Scores collection (modifying memberNumber & memberNumberDivision)
 * Deletes from Shooters collection.
 */
const fixUp = async () => {
  await connect();

  const regexForPrefix = /^(A|TY|FY)/;
  const shooters = await Shooters.find({
    memberNumber: regexForPrefix,
  })
    .select(["memberNumber"])
    .limit(0);
  console.error(`total ${shooters.length}`);

  const shootersByTrimmedNumbers = shooters.reduce(
    (acc, cur) => {
      const numberOnly = cur.memberNumber.replace(regexForPrefix, "");
      const curArray = (acc[numberOnly] ??= []);

      // dont insert sequential dupes (same number different divisions)
      if (curArray[curArray.length - 1] !== cur.memberNumber) {
        curArray.push(cur.memberNumber);
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );
  const candidateNumbersGroups = Object.values(shootersByTrimmedNumbers).filter(
    (group: string[]) => group.length > 1,
  );

  const candidateNumbers = candidateNumbersGroups.flat();
  console.error(`rename candidates = ${candidateNumbers.length}`);

  const scores = await Scores.find({
    memberNumber: { $in: candidateNumbers },
  })
    .select(["memberNumber", "sd"])
    .sort({ sd: -1 });
  console.error(`scores = ${scores.length}`);

  const scoresSortedMemberNumbersByTrimmedNumbers = scores.reduce(
    (acc, cur) => {
      const numberOnly = cur.memberNumber.replace(regexForPrefix, "");
      const curArray = (acc[numberOnly] ??= []);

      // dont insert dupes (same number different divisions/scores)
      if (!curArray.includes(cur.memberNumber)) {
        const fixedNumber = cur.memberNumber
          .trim()
          .replaceAll("-", "")
          .replaceAll(" ", "");
        curArray.push(fixedNumber);
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const shooterRenameMap = Object.keys(scoresSortedMemberNumbersByTrimmedNumbers).reduce(
    (acc, curKey) => {
      const fixedKey = curKey.trim().replaceAll("-", "").replaceAll(" ", "");
      if (!fixedKey) {
        return acc;
      }
      const cur = scoresSortedMemberNumbersByTrimmedNumbers[curKey].reverse();
      const lastNumber = cur.pop();
      cur.forEach(oldNumber => {
        if (oldNumber !== lastNumber) {
          acc[oldNumber] = lastNumber;
        }
      });
      return acc;
    },
    {},
  );

  // rename scores
  const oldNumbersToProcess = Object.keys(shooterRenameMap);
  console.log(`renames = ${oldNumbersToProcess.length}`);
  while (oldNumbersToProcess.length) {
    const curBatch = oldNumbersToProcess.splice(0, 20);
    console.log(`renaming, ${oldNumbersToProcess.length} numbers left`);

    const scoreUpdateMany = curBatch.map(oldMemberNumber => ({
      updateMany: {
        filter: {
          memberNumber: oldMemberNumber,
        },
        update: [
          {
            $set: {
              memberNumber: shooterRenameMap[oldMemberNumber],
              memberNumberDivision: {
                $concat: [shooterRenameMap[oldMemberNumber], ":", "$division"],
              },
            },
          },
        ],
      },
    }));
    await Scores.bulkWrite(scoreUpdateMany);
    await MatchScores.bulkWrite(scoreUpdateMany);
  }
  console.log("scores renaming complete");

  // delete renamed shooters
  console.log("deleting oldNumber shooters");
  const resultDelete = await Shooters.deleteMany({
    memberNumber: { $in: Object.keys(shooterRenameMap) },
  });
  console.log("complete! Now dedupe scores and rehydrate.");
  console.log(JSON.stringify(resultDelete, null, 2));
  process.exit(0);
};

fixUp();
