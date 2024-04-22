import { connect, hydrate } from "../api/src/db/index.js";

const hydrateMongo = async () => {
  await connect();
  await hydrate();
};

hydrateMongo();
