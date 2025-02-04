/* eslint-disable no-console */

import { connect } from "../../api/src/db";
import { Matches } from "../../api/src/db/matches";
import {
  findAFewMatches,
  matchesForUploadFilter,
  uploadMatches,
} from "../../api/src/worker/uploads";

const scoresLoop = async ({ batchSize = 12 } = {}) => {
  const onlyUSPSAorSCSA = { templateName: { $in: ["USPSA" /*, "Steel Challenge"*/] } };
  const count = await Matches.countDocuments(matchesForUploadFilter(onlyUSPSAorSCSA));
  console.log(`${count} uploads in the queue (USPSA, SCSA only)`);

  let numberOfUpdates = 0;
  let fewMatches = [] as Awaited<ReturnType<typeof findAFewMatches>>;
  let totalMatchesUploaded = 0;
  do {
    fewMatches = await findAFewMatches(onlyUSPSAorSCSA, batchSize);
    totalMatchesUploaded += fewMatches.length;
    if (!fewMatches.length) {
      return numberOfUpdates;
    }
    const uploadResults = await uploadMatches({ matches: fewMatches });
    numberOfUpdates += uploadResults.classifiers?.length || 0;

    const matchesWithScoresUUIDs = uploadResults?.matches || [];

    const uuidsWithStatus = Object.fromEntries(
      fewMatches.map(m => [
        m.uuid,
        matchesWithScoresUUIDs.includes(m.uuid) ? "✅" : "❌",
      ]),
    );
    console.log(uuidsWithStatus);

    // console.log(JSON.stringify(uploadResults, null, 2));
    console.log(
      `${uploadResults?.classifiers?.length || 0} classifiers; ${
        uploadResults?.shooters?.length || 0
      } shooters`,
    );

    await Matches.bulkWrite(
      fewMatches.map(m => ({
        updateOne: {
          filter: { _id: m._id },
          update: {
            $set: {
              ...m.toObject(),
              uploaded: new Date(),
              hasScores: matchesWithScoresUUIDs.includes(m.uuid),
            },
          },
        },
      })),
    );
    console.log(`done ${totalMatchesUploaded}/${count}`);
  } while (fewMatches.length);

  return numberOfUpdates;
};

const go = async () => {
  await connect();

  const numberOfUpdates = await scoresLoop();
  console.log(`total number of updates: ${numberOfUpdates}`);

  process.exit(0);
};

go();
