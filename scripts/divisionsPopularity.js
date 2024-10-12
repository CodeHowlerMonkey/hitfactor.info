/* eslint-disable no-console */
import fs from "fs";

import { Percent } from "../api/src/dataUtil/numbers";
import { connect } from "../api/src/db/index";
import { uspsaDivisionsPopularity } from "../api/src/db/scores";

const saveDivisionPopularityYear = async year => {
  console.log(`fetching year ${year}`);
  const data = await uspsaDivisionsPopularity(year);
  const total = data.reduce((acc, cur) => acc + cur.scores, 0);

  const dataWithPercent = data.map(cur => {
    cur.percent = Percent(cur.scores, total);
    return cur;
  });

  console.log(`saving...`);
  fs.writeFileSync(
    `./data/stats/divisions_${year}YTD.json`,
    JSON.stringify({ data: dataWithPercent, total }, null, 2),
  );
  console.log("ok");
};

const go = async () => {
  await connect();

  await saveDivisionPopularityYear(0);
  await saveDivisionPopularityYear(1);
  await saveDivisionPopularityYear(2);
  await saveDivisionPopularityYear(3);
  await saveDivisionPopularityYear(4);
  await saveDivisionPopularityYear(5);
  await saveDivisionPopularityYear(6);
  await saveDivisionPopularityYear(7);
  await saveDivisionPopularityYear(8);

  console.log("done");
  process.exit(0);
};

go();
