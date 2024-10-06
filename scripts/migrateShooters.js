import uniqBy from "lodash.uniqby";
import { connect } from "../api/src/db/index";
import { reclassifyShooters, Shooter } from "../api/src/db/shooters";
import {
  arrayWithExplodedDivisions,
  hfuDivisionCompatabilityMap,
  hfuDivisionsShortNames,
  pairToDivision,
} from "../shared/constants/divisions";

const rehydrateAllShooters = async () => {
  const allShooters = await Shooter.find({
    memberNumberDivision: { $exists: true },
    division: { $nin: hfuDivisionsShortNames },
    reclassificationsRecPercentCurrent: { $gt: 0 },
  })
    .limit(0)
    .select(["memberNumberDivision", "name", "memberNumber"])
    .lean();

  const namesMap = allShooters.reduce((acc, cur) => {
    acc[cur.memberNumber] = cur.name;
    return acc;
  }, {});
  const allMemberNumberDivision = allShooters.map(
    ({ memberNumberDivision }) => memberNumberDivision
  );

  const nonUniqueShooters = arrayWithExplodedDivisions(
    allMemberNumberDivision,
    hfuDivisionCompatabilityMap,
    pairToDivision,
    (originalMemberNumberDivision, division) => {
      const memberNumber = originalMemberNumberDivision.split(":")[0];
      return {
        memberNumberDivision: [memberNumber, division].join(":"),
        memberNumber,
        division,
        name: namesMap[memberNumber],
      };
    }
  ).filter((s) => hfuDivisionsShortNames.includes(s.division));
  const shooters = uniqBy(nonUniqueShooters, (s) => s.memberNumberDivision);

  console.log("Total New Shooters to Process: " + shooters.length);

  const batchSize = 64;
  for (let i = 0; i < shooters.length; i += batchSize) {
    const batch = shooters.slice(i, i + batchSize);
    await reclassifyShooters(batch);
    process.stdout.write(`\r${i + batchSize}/${shooters.length}`);
  }
};

const migrate = async () => {
  await connect();
  await rehydrateAllShooters();
};

migrate();
