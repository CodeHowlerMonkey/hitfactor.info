import mongoose from "mongoose";
import { hydrateStats } from "./stats.js";
import { hydrateScores } from "./scores.js";
import { hydrateRecHHF } from "./recHHF.js";
import { hydrateShooters } from "./shooters.js";
import { hydrateClassifiersExtendedMeta } from "./classifiers.js";

export const connect = async () => {
  const { QUICK_DEV, MONGO_URL, MONGO_URL_QUICK } = process.env;
  const url = !QUICK_DEV ? MONGO_URL : MONGO_URL_QUICK;
  const _connect = () => {
    console.error("DB: connecting");
    return mongoose.connect(url);
  };

  mongoose.connection.on("error", function (e) {
    console.error("Mongo connection error:");
    if (e) {
      console.error(e);
    }
  });

  mongoose.connection.on("disconnected", async () => {
    console.error("DB: lost connection");
    await _connect();
  });
  mongoose.connection.on("connected", function () {
    console.error("DB: connected");
  });

  mongoose.connection.on("reconnected", function () {
    console.error("DB: reconnected");
  });

  // Close the Mongoose connection, when receiving SIGINT
  process.on("SIGINT", function () {
    mongoose.connection.close(function () {
      console.error("DB: closed on SIGINT");
      process.exit(0);
    });
  });
  await _connect();
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
