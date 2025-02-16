/* eslint-disable no-console */
import fs from "fs";

import { connect } from "../../api/src/db";
import { Matches, matchFromMatchDef } from "../../api/src/db/matches";
import { Shooters } from "../../api/src/db/shooters";
import { fetchPS, hitFactorLikeMatchInfo } from "../../api/src/worker/uploads";

const go = async () => {
  const natsResults = JSON.parse(fs.readFileSync("./coNats24ResultsByMemberNumber.json"));
  const results = JSON.parse(JSON.stringify(natsResults));
  const memberNumbers = Object.keys(results);

  await connect();
  const shooters = await Shooters.find({
    memberNumber: { $in: memberNumbers },
    division: "co",
  })
    .limit(0)
    .lean()
    .select([
      "memberNumber",
      "reclassificationsRecPercentUncappedHigh",
      "reclassificationsRecPercentUncappedCurrent",
    ]);
  const shootersByMemberNumber = shooters.reduce((acc, c) => {
    acc[c.memberNumber] = c;
    return acc;
  }, {});

  Object.keys(results).forEach(memberNumber => {
    const shooter = shootersByMemberNumber[memberNumber];
    if (!shooter) {
      delete results[memberNumber];
      console.error(memberNumber);
    } else {
      results[memberNumber].rec = shooter.reclassificationsRecPercentUncappedCurrent;
      results[memberNumber].recHigh = shooter.reclassificationsRecPercentUncappedHigh;
    }
  });

  console.log(JSON.stringify(results, null, 2));

  console.error(
    `done ${Object.keys(results).length} shooters out of ${Object.keys(natsResults).length}`,
  );
  process.exit(0);
};

go();
