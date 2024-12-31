/* eslint-disable no-console */

import { uspsaClassifiers } from "../../api/src/dataUtil/classifiersData";
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

const migrate = async () => {
  await connect();
  await rehydrateRecHHF(uspsaDivShortNames, uspsaClassifiers);
  await rehydrateShooters(uspsaDivShortNames);
  // TODO: await rehydrateClassifiers(classifierDivision-s);
  await hydrateStats();

  console.error("\ndone");
  process.exit(0);
};

migrate();
