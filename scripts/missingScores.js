import { connect } from "../api/src/db/index.js";
import {
  processUploadResults,
  uploadResultsForMatchUUIDs,
} from "../api/src/worker/uploads.js";

// some scores are missing in SLPSA Sept #1 2024
const go = async () => {
  await connect();

  const scores = await uploadResultsForMatchUUIDs([
    "4cb1c5e0-4c2c-4a75-b6b9-4bb1986e587d",
  ]);

  await processUploadResults({ uploadResults: scores, skipAfterUploadHydration: true });

  console.log("complete");
  //console.log(JSON.stringify(scores, null, 2));
  //console.log(JSON.stringify(scores.scores.length, null, 2));
};

go();
