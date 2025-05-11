/* eslint-disable no-console */

import uniqBy from "lodash.uniqby";

import {
  connect,
  MatchBumps,
  matchBumpsForMatchResults,
  saveMatchBumps,
  backfillComboClassifications,
  MatchScores,
  saveMatchScores,
  Matches,
} from "@api/db";
import { matchBumpThresholds } from "@shared/constants/difficulty";

const recalculateBumpForMatch = async (uuid: string) => {
  const scores = await MatchScores.find({ upload: uuid }).limit(0).lean();
  const backfilled = await backfillComboClassifications(scores);
  await saveMatchScores(backfilled);
  const bumps = matchBumpsForMatchResults(backfilled);
  await saveMatchBumps(bumps);
};

const rebump = async () => {
  await connect();

  const maybeEligibleMatches = await MatchBumps.find({
    filteredDataPoints: { $gte: matchBumpThresholds.filteredDataPointsMaybe },
    filteredCorrelation: { $gte: matchBumpThresholds.filteredCorrelation },
  })
    .limit(0)
    .select(["upload", "division"])
    .lean();

  const uuids = uniqBy(
    maybeEligibleMatches.map(c => c.upload),
    c => c,
  );
  console.log(`${uuids.length} possibly eligible matches`);
  process.exit(0);

  const matches = await Matches.find({ uuid: { $in: uuids } })
    .limit(0)
    .select(["name", "created", "updated"])
    .sort({ created: 1 });
  console.log(
    JSON.stringify(
      matches.map(m => m.name),
      null,
      2,
    ),
  );

  let i = 0;
  for (const uuid of uuids) {
    console.log(`processing ${++i}/${uuids.length}`);
    await recalculateBumpForMatch(uuid);
  }
  process.exit(0);
};

rebump();
