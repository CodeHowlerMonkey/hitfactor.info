/* eslint-disable no-console */

import { connect } from "@api/db";
import { Score, Scores } from "@api/db/scores";
import { Shooter, Shooters } from "@api/db/shooters";
import { loadAllJSONFromDir } from "@api/utils";
import { uspsaDivIdToShort } from "@shared/constants/divisions";
import { UTCDate } from "@shared/utils/date";

// TODO: old deprecated import, remove
export const binaryScoreFromUSPSAScore = (uspsaScore): Score => {
  const hf = Number(uspsaScore.hit_factor);

  const division = uspsaDivIdToShort[uspsaScore.division_id];
  const memberNumber = uspsaScore.member_number;
  const classifier = uspsaScore.classfier_code;
  const sd = UTCDate(uspsaScore.match_date);

  return {
    hf,
    memberNumber,
    classifier,
    division,
    memberNumberDivision: [memberNumber, division].join(":"),
    classifierDivision: [classifier, division].join(":"),
    sd,
    modified: sd,
    source: "Stage Score",

    percent: uspsaScore.classification_pct,
    code: uspsaScore.classifier_flag,

    templateName: "USPSA",
    type: "USPSA",
    subType: "USPSA",

    shooterFullName: `${uspsaScore.first_name} ${uspsaScore.last_name}`,
  };
};

const all = loadAllJSONFromDir("../../data/uspsa/classifiers").map(
  binaryScoreFromUSPSAScore,
);

const shooters = Object.values(
  all.reduce((acc, cur: Score) => {
    const { memberNumberDivision, shooterFullName, memberNumber, division } = cur;
    acc[memberNumberDivision] = {
      name: shooterFullName,
      memberNumberDivision,
      memberNumber,
      division,
    };
    return acc;
  }, {}),
);

console.log("JSON Files Loaded");
console.log(`${all.length} Scores`);
console.log(`${shooters.length} Shooters`);

const hydrateScores = async () => {
  console.error(`Total Scores to Hydrate: ${all.length}`);

  const batchSize = 128;
  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize);
    await Scores.insertMany(batch as Score[]);
  }
};

const hydrateShooters = async () => {
  console.error(`Total Shooters to Hydrate: ${shooters.length}`);

  const batchSize = 128;
  for (let i = 0; i < shooters.length; i += batchSize) {
    const batch = shooters.slice(i, i + batchSize);
    await Shooters.insertMany(batch as Shooter[]);
  }
};

const go = async () => {
  await connect();

  console.error("hydrating scores");
  await hydrateScores();

  console.error("hydrating shooters");
  await hydrateShooters();

  console.error("\ndone, now run rehydrateForCC");
  process.exit(0);
};

go();
