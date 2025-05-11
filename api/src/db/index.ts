/* eslint-disable no-console */
import fs from "fs";

import mongoose from "mongoose";

export * from "./matches";
export * from "./scores";
export * from "./matchScores";
export * from "./matchBumps";
export * from "./recHHF";
export * from "./shooters";
export * from "./reports";
export * from "./stats";
export * from "./afterUploadClassifiers";
export * from "./afterUploadShooters";

const isDocker =
  fs.existsSync("/.dockerenv") ||
  (fs.existsSync("/proc/1/cgroup") &&
    fs.readFileSync("/proc/1/cgroup", "utf8").includes("docker")) ||
  process.env.CONTAINER === "docker" ||
  process.env.DOCKER === "true";

const defaultLocalDB = isDocker ? "host.docker.internal" : "127.0.0.1";

export const connect = async () => {
  const { MONGO_URL } = process.env;
  const url = MONGO_URL || `mongodb://${defaultLocalDB}:27017/uspsa`;

  if (!url) {
    throw new Error("No DB Url");
  }

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
