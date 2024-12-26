/* eslint-disable no-console */
import mongoose from "mongoose";

import { hydrateClassifiersExtendedMeta } from "./classifiers";
import { rehydrateRecHHF } from "./recHHF";
import { hydrateScores } from "./scores";
import { hydrateShooters } from "./shooters";
import { hydrateStats } from "./stats";

export const connect = async () => {
  const { LOCAL_DEV, MONGO_URL, MONGO_URL_LOCAL } = process.env;
  if (!LOCAL_DEV && !MONGO_URL) {
    throw new Error(
      `Environment Variable MONGO_URL must be specified in top-level environment variables in sandbox mode.`,
    );
  }
  const url = !LOCAL_DEV ? MONGO_URL : MONGO_URL_LOCAL;

  const publicLogsDBHost = url!.split("@")[1]?.split(".")[0] || "local";
  const dbName = url!.split("?")[0]?.split("/").reverse()[0] || "root";

  const _connect = () => {
    console.error("DB: connecting");
    return mongoose.connect(url!);
  };

  mongoose.connection.on("error", e => {
    console.error("Mongo connection error:");
    if (e) {
      console.error(e);
    }
  });

  mongoose.connection.on("disconnected", async () => {
    console.error("DB: lost connection");
    await _connect();
  });
  mongoose.connection.on("connected", () => {
    console.error(`DB: connected to ${publicLogsDBHost} ${dbName}`);
  });

  mongoose.connection.on("reconnected", () => {
    console.error("DB: reconnected");
  });

  // Close the Mongoose connection, when receiving SIGINT
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  await _connect();
};

// legacy hydration from USPSA json files, probably doesn't work anymore
export const hydrate = async () => {
  console.log("hydrating everything");
  console.time("full hydration");

  await hydrateScores();
  await rehydrateRecHHF();
  await hydrateShooters();
  await hydrateClassifiersExtendedMeta();
  await hydrateStats();

  console.timeEnd("full hydration");
  console.log("hydration done");
};
