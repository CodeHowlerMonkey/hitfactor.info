/* eslint-disable no-console */
import fs from "fs";

import { Percent } from "../api/src/dataUtil/numbers";
import { connect, matchScoresFor } from "../api/src/db/index";
import { uspsaDivisionsPopularity } from "../api/src/db/scores";
import { uspsaDivShortNames } from "../shared/constants/divisions";

/**
 * Updates data for Stats -> Divisions tab
 * Just run and commit changes.
 */
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

const saveMajorDivisionPopularityYear = async (year, level = 2) => {
  console.log(`fetching majors year ${year} level ${level}`);
  const curYear = new Date().getUTCFullYear();
  const since = new Date();
  since.setUTCFullYear(curYear - year - 1);
  const until = new Date();
  until.setUTCFullYear(curYear - year);

  const matchScores = await matchScoresFor({
    since,
    until,
  });

  const uspsaMajorMatchScores = matchScores.filter(
    c => uspsaDivShortNames.includes(c.division) && c.level >= level,
  );

  const { total, ...byDivision } = uspsaMajorMatchScores.reduce(
    (acc, cur) => {
      acc[cur.division] ??= 0;
      acc[cur.division] += 1;
      acc.total += 1;
      return acc;
    },
    { total: 0 },
  );

  const data = Object.entries(byDivision).map(([division, scores]) => ({
    _id: division,
    scores,
    start: since,
    end: until,
    percent: (100 * scores) / total,
  }));
  console.log(`saving...`);
  fs.writeFileSync(
    `./data/stats/divisions_majors_lvl${level}_${year}YTD.json`,
    JSON.stringify({ data, total }, null, 2),
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

  await saveMajorDivisionPopularityYear(0);
  await saveMajorDivisionPopularityYear(1);
  await saveMajorDivisionPopularityYear(2);
  await saveMajorDivisionPopularityYear(3);
  await saveMajorDivisionPopularityYear(4);
  await saveMajorDivisionPopularityYear(5);
  await saveMajorDivisionPopularityYear(6);
  await saveMajorDivisionPopularityYear(7);
  await saveMajorDivisionPopularityYear(8);

  console.log("done");
  process.exit(0);
};

go();
