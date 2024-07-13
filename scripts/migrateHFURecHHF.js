import { connect } from "../api/src/db/index.js";
import { rehydrateRecHHF } from "../api/src/db/recHHF.js";

const migrate = async () => {
  await connect();

  await rehydrateRecHHF();
};

migrate();
