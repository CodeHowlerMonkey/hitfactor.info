/* eslint-disable no-console */

import { connect } from "../../api/src/db/index";
import { Score, scoreFromUSPSAScore, Scores, USPSAScore } from "../../api/src/db/scores";
import { Shooter, Shooters } from "../../api/src/db/shooters";
import uspsa1 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_1.json";
import uspsa10 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_10.json";
import uspsa11 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_11.json";
import uspsa12 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_12.json";
import uspsa13 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_13.json";
import uspsa14 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_14.json";
import uspsa15 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_15.json";
import uspsa2 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_2.json";
import uspsa3 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_3.json";
import uspsa4 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_4.json";
import uspsa5 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_5.json";
import uspsa6 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_6.json";
import uspsa7 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_7.json";
import uspsa8 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_8.json";
import uspsa9 from "../../data/uspsa/2025-02-07-07-46-59_classifier_data_9.json";

const all: Score[] = (
  [
    uspsa1,
    uspsa2,
    uspsa3,
    uspsa4,
    uspsa5,
    uspsa6,
    uspsa7,
    uspsa8,
    uspsa9,
    uspsa10,
    uspsa11,
    uspsa12,
    uspsa13,
    uspsa14,
    uspsa15,
  ].flat() as USPSAScore[]
).map(scoreFromUSPSAScore);

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

console.log(all.length);
console.log(shooters.length);

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
