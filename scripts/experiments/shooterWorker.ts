import { connect } from "../../api/src/db/index";
import { reclassifyShooters } from "../../api/src/db/shooters";

const worker = async batch => {
  await reclassifyShooters(batch);
  process.stdout.write(".");
};

const initialize = async () => {
  await connect();
  return worker;
};

export default initialize();
