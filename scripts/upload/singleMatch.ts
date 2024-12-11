/* eslint-disable no-console */
import { connect } from "../../api/src/db/index";
import { matchFromMatchDef } from "../../api/src/db/matches";
import { fetchPS } from "../../api/src/worker/uploads";

const go = async () => {
  const matchUUID = process.argv[2];
  if (!matchUUID) {
    console.error("must provide match name");
    process.exit(1);
  }

  const { matchDef, scores, results } = await fetchPS(matchUUID);
  const match = matchFromMatchDef(matchDef);
  console.log(JSON.stringify(match, null, 2));

  //await connect();

  process.exit(0);
};

go();
