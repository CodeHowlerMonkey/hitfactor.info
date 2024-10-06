import { connect } from "../api/src/db/index";
import { rehydrateRecHHF } from "../api/src/db/recHHF";

const migrate = async () => {
  await connect();

  await rehydrateRecHHF();
};

migrate();
