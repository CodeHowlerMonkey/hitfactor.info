import { connect } from "../api/src/db/index";
import { Matches } from "../api/src/db/matches";
import { _fetchPSS3ObjectJSON } from "../api/src/worker/uploads";

/**
 * Marks all USPSA matches after June 1st 2024 as not-uploaded, so new
 * fixed upload worker can pick them up and re-upload.
 */
const go = async () => {
  await connect();
  const whenUploadsGotBroken = new Date("2024-06-01");
  const matches = await Matches.find({
    updated: { $gt: whenUploadsGotBroken },
    templateName: "USPSA",
  }).lean();
  console.log(matches.length);

  await Matches.bulkWrite(
    matches.map(m => ({
      updateOne: {
        filter: { _id: m._id },
        update: { $unset: { uploaded: 1 } },
      },
    })),
  );
  console.log("done");
};

go();
