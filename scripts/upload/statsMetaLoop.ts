import { connect } from "../../api/src/db";
import { metaLoop } from "../../api/src/worker/uploads";

export const statsMetaLoop = async () => {
  await connect();

  await metaLoop();

  process.exit(0);
};

statsMetaLoop();
