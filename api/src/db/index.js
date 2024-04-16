import mongoose from "mongoose";
import { hydrateStats } from "./stats.js";
import { hydrateScores } from "./scores.js";
import { hydrateRecHHF } from "./recHHF.js";
import { hydrateShooters } from "./shooters.js";
import { hydrateClassifiersExtendedMeta } from "./classifiers.js";

export const connect = async () => {
  const { QUICK_DEV, MONGO_URL, MONGO_URL_QUICK } = process.env;
  const url = !QUICK_DEV ? MONGO_URL : MONGO_URL_QUICK;
  await mongoose.connect(url);
};

export const hydrate = async () => {
  console.log("hydrating everything");
  console.time("full hydration");

  await hydrateScores();
  await hydrateRecHHF();
  await hydrateShooters();
  await hydrateClassifiersExtendedMeta();
  await hydrateStats();

  console.timeEnd("full hydration");
  console.log("hydration done");
};

export const testModels = async () => {
  const whateverSchema = new mongoose.Schema({}, { strict: false });

  const Whatever1Model = mongoose.model("Whatever1", whateverSchema);
  const Whatever2Model = mongoose.model("Whatever2", whateverSchema);

  const w1 = new Whatever1Model({ a: 1, b: 2, c: 3 });
  await w1.save();

  const w2 = new Whatever1Model({ a: 2, b: "4 as a string", c: 6, d: 8 });
  await w2.save();

  const w3 = new Whatever2Model({ foo: "bar" });
  await w3.save();

  const two = await Whatever1Model.find();
  const one = await Whatever2Model.find();
  console.log(JSON.stringify({ two, one }, null, 2));
};
