import { connect, hydrate, testModels } from "./db/index.js";

const hydrateMongo = async () => {
  await connect();
  await hydrate();
  //await testModels();
};

hydrateMongo();
