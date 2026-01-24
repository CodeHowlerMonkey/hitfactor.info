/* eslint-disable no-console */
import { connect, matchScoresFor } from "../../api/src/db/index";

const go = async () => {
  await connect();

  for (const year of [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016]) {
    console.log(`===== ${year} =====`);
    const allMatchScores = await matchScoresFor({
      since: new Date(`${year - 1}-01-01`),
      until: new Date(`${year}-01-01`),
    });
    const levelTwo = allMatchScores.filter(ms => ms.level >= 2);
    const eligible = levelTwo.filter(ms => ms.eligible);

    console.log(`all:      ${allMatchScores.length}`);
    console.log(`lvl2+:    ${levelTwo.length}`);
    console.log(`eligible: ${eligible.length}`);
  }

  process.exit(0);
};

go();
