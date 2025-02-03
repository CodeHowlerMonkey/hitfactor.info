/* eslint-disable no-console */

import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import Piscina from "piscina";

import { uspsaClassifiers } from "../../api/src/dataUtil/classifiersData";
import { rehydrateClassifiers } from "../../api/src/db/classifiers";
import { connect } from "../../api/src/db/index";
import { rehydrateRecHHF } from "../../api/src/db/recHHF";
import { Shooters } from "../../api/src/db/shooters";
import { hydrateStats } from "../../api/src/db/stats";
import { uspsaDivShortNames } from "../../shared/constants/divisions";

export const goodClassifiers = [
  "24-08",
  "21-01",
  "20-01",
  "19-02",
  "18-09",
  "19-04",
  "20-03",
  "18-03",
  "99-28",
  "03-05",
  "22-01",
  "22-07",
  "13-05",
];

const rehydrateShooters = async (divisions: string[]) => {
  const shooters = await Shooters.find({
    memberNumberDivision: { $exists: true },
    division: { $in: divisions },
    // reclassificationsRecPercentCurrent: { $gt: 0 },
    // elo: { $gt: 0 },
  })
    .limit(0)
    .select(["memberNumberDivision", "name", "memberNumber", "division"])
    .lean();

  console.error(
    `Total ${JSON.stringify(divisions)} Shooters to Process: ${shooters.length}`,
  );

  const pool = new Piscina({
    filename: path.resolve(__dirname, "shooterWorker.ts"),
  });

  console.time("shooters");
  const jobs = [] as Promise<void>[];
  const batchSize = 64;
  for (let i = 0; i < shooters.length; i += batchSize) {
    const batch = shooters.slice(i, i + batchSize);
    jobs.push(pool.run(batch));
  }

  await Promise.all(jobs);
  await pool.destroy();
  console.timeEnd("shooters");
};

const go = async () => {
  await connect();

  const classifiers = uspsaClassifiers;
  const divisions = uspsaDivShortNames;
  const classifierDivisions = divisions
    .map(division => classifiers.map(classifier => ({ classifier, division })))
    .flat();

  console.error("rechhf go");
  await rehydrateRecHHF(divisions, classifiers);

  console.error("shooters go");
  await rehydrateShooters(divisions);

  console.error("classifiers go");
  await rehydrateClassifiers(classifierDivisions);

  console.error("stats go");
  await hydrateStats();

  console.error("\ndone");
  process.exit(0);
};

go();
