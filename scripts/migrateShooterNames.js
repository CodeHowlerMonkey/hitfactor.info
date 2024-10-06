import { connect } from "../api/src/db/index";
import { Shooter } from "../api/src/db/shooters";
import { hfuDivisionsShortNames } from "../shared/constants/divisions";

const hydrateMissingNames = async () => {
  const missingNameShooters = await Shooter.find({
    division: { $in: hfuDivisionsShortNames },
    name: { $exists: false },
  })
    .limit(0)
    .select(["_id", "memberNumber"])
    .lean();
  const missingNameShooterMemberNumbers = missingNameShooters.map(
    ({ memberNumber }) => memberNumber
  );
  console.log("missing: " + missingNameShooters.length);
  return;

  const sameNumberShootersWithNames = await Shooter.find({
    name: { $exists: true },
    memberNumber: { $in: missingNameShooterMemberNumbers },
  })
    .select(["memberNumber", "name"])
    .limit(0)
    .lean();
  console.log("same with names: " + sameNumberShootersWithNames.length);

  const namesMap = sameNumberShootersWithNames.reduce((acc, cur) => {
    acc[cur.memberNumber] = cur.name;
    return acc;
  }, {});
  console.log("map: " + Object.keys(namesMap).length);

  const shooterUpdates = missingNameShooters
    .map(({ _id, memberNumber }) => ({
      updateOne: {
        filter: { _id },
        update: { $set: { name: namesMap[memberNumber] } },
      },
    }))
    .filter((c) => c.updateOne.update.$set.name?.length);
  console.log("updates: " + shooterUpdates.length);

  const batchSize = 128;
  for (let i = 0; i < shooterUpdates.length; i += batchSize) {
    const batch = shooterUpdates.slice(i, i + batchSize);
    await Shooter.bulkWrite(batch);
    process.stdout.write(`\r${i + batchSize}/${shooterUpdates.length}`);
  }
};

const migrate = async () => {
  await connect();
  await hydrateMissingNames();
};

migrate();
