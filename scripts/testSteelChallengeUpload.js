import { connect } from "../api/src/db/index.js";
import { uploadMatches } from "../api/src/worker/uploads.js";

const test = async () => {
  await connect();
  await uploadMatches(["c42f9251-3781-43c4-9a63-4cfe9c4af0c8"]);
};

test();
