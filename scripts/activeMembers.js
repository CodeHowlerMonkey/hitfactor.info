import { saveActiveMembersFromPSClassUpdate } from "../api/src/db/activeMembers.js";
import { connect } from "../api/src/db/index.js";
import {
  fetchPSClassUpdateCSVTextFile,
  practiscoreClassUpdateFromTextFile,
} from "../api/src/worker/classUpdate.js";

import fs from "fs";

const go = async () => {
  let text = null;

  const filenameArg = process.argv[2];
  if (filenameArg) {
    console.log(filenameArg);
    text = String(fs.readFileSync(filenameArg, "utf8"));
  }

  if (!text) {
    text = await fetchPSClassUpdateCSVTextFile();
  }
  const update = await practiscoreClassUpdateFromTextFile(text);
  if (!update) {
    return;
  }

  await connect();
  const dbResult = await saveActiveMembersFromPSClassUpdate(update);
  console.log(dbResult);
};

go();
