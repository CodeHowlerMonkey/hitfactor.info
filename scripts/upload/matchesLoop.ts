/* eslint-disable no-console */

import { connect } from "../../api/src/db";
import {
  fetchAndSaveMoreMatchesById,
  fetchAndSaveMoreMatchesByUpdatedDate,
} from "../../api/src/db/matches";

export const matchesLoop = async () => {
  await connect();

  const numberOfNewMatches = await fetchAndSaveMoreMatchesById();
  const numberOfUpdatedMatches = await fetchAndSaveMoreMatchesByUpdatedDate();
  console.log(`fetched ${numberOfNewMatches} new matches`);
  console.log(`fetched ${numberOfUpdatedMatches} updated matches`);

  process.exit(0);
};

matchesLoop();
