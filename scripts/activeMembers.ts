/* eslint-disable no-console */
import fs from "fs";

import { saveActiveMembersFromPSClassUpdate } from "../api/src/db/activeMembers";
import { connect } from "../api/src/db/index";
import {
  fetchPSClassUpdateCSVTextFile,
  practiscoreClassUpdateFromTextFile,
} from "../api/src/worker/classUpdate";

const go = async () => {
  let text: string | null = null;

  const filenameArg = process.argv[2];
  if (filenameArg) {
    console.log(filenameArg);
    text = String(fs.readFileSync(filenameArg, "utf8"));
  }

  if (!text) {
    text = await fetchPSClassUpdateCSVTextFile();
  }

  const update = practiscoreClassUpdateFromTextFile(text);
  if (!update) {
    return;
  }

  await connect();
  const dbResult = await saveActiveMembersFromPSClassUpdate(update);
  console.log(dbResult);

  process.exit(0);
};

go();
