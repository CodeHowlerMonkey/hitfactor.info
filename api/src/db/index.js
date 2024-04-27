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
