/* eslint-disable no-console */

import { uspsaClassifiers } from "../../api/src/dataUtil/classifiersData";
import { rehydrateClassifiers } from "../../api/src/db/classifiers";
import { connect } from "../../api/src/db/index";
import { rehydrateRecHHF } from "../../api/src/db/recHHF";
import { reclassifyShooters, Shooters } from "../../api/src/db/shooters";
import { hydrateStats } from "../../api/src/db/stats";
import { uspsaDivShortNames } from "../../shared/constants/divisions";

const rehydrateShooters = async (divisions: string[]) => {
  const shooters = await Shooters.find({
    memberNumberDivision: { $exists: true },
    division: { $in: divisions },
    reclassificationsRecPercentCurrent: { $gt: 0 },
  })
    .limit(0)
    .select(["memberNumberDivision", "name", "memberNumber", "division"])
    .lean();

  console.error(
    `Total ${JSON.stringify(divisions)} Shooters to Process: ${shooters.length}`,
  );

  const batchSize = 64;
  for (let i = 0; i < shooters.length; i += batchSize) {
    const batch = shooters.slice(i, i + batchSize);
    const actualBatchSize = batch.length;
    await reclassifyShooters(batch);
    process.stdout.write(`\r${i + actualBatchSize}/${shooters.length}`);
  }
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
