/* eslint-disable no-console */
import { execSync } from "child_process";

const go = async () => {
  const matchUUID = process.argv[2];
  const dbName = process.argv[3];

  if (!matchUUID || !dbName) {
    console.error("Must provide match uuid and short dbName for it");
    process.exit(1);
  }

  const MONGO_URL = `mongodb://127.0.0.1:27017/${dbName}`;
  try {
    execSync(
      `MONGO_URL=${MONGO_URL} VITE_FEATURES_MAJOR=1 npx tsx scripts/upload/singleMatch.ts ${matchUUID} Major`,
      {
        stdio: "inherit",
      },
    );
  } catch (error) {
    console.error(`Error running singleMatch: ${error}`);
  }
  console.error("done uploading, running server");

  execSync(`MONGO_URL=${MONGO_URL} VITE_FEATURES_MAJOR=1 npm start`, {
    stdio: "inherit",
  });
};

go();
