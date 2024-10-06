import { connect, hydrate } from "../api/src/db/index";

const hydrateMongo = async () => {
  await connect();
  await hydrate();
};

hydrateMongo();
