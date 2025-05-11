/* eslint-disable no-console */

import uniqBy from "lodash.uniqby";

import {
  connect,
  matchBumpsForMatchResults,
  saveMatchBumps,
  MatchScores,
  saveMatchScores,
  MatchBumps,
  backfillComboClassifications,
} from "@api/db";
import { MatchBumpWithVirtuals } from "@data/types/MatchBump";

const recalculateBumpForMatch = async (uuid: string) => {
  const scores = await MatchScores.find({ upload: uuid }).limit(0).lean();
  const matchDate = scores[0].date;
  console.log(matchDate.toLocaleDateString());
  const backfilled = await backfillComboClassifications(scores, matchDate);
  await saveMatchScores(backfilled);
  const bumps = matchBumpsForMatchResults(backfilled);
  await saveMatchBumps(bumps);
};

const rebump = async () => {
  const matchUUID = process.argv[2];
  if (!matchUUID) {
    console.error("must provide match uuid");
    process.exit(1);
  }

  await connect();
  const scores = await MatchScores.find({ upload: matchUUID }).limit(0).lean();
  const memberNumbers = uniqBy(
    scores.map(c => c.memberNumber),
    c => c,
  );
  const allScores = await MatchScores.find({ memberNumber: { $in: memberNumbers } })
    .limit(0)
    .lean();
  console.log(allScores.length);
  const otherMatches = Object.entries(
    allScores.reduce(
      (acc, cur) => {
        acc[cur.upload] = cur.date;
        return acc;
      },
      {} as Record<string, Date>,
    ),
  )
    .sort((a, b) => a[1].getTime() - b[1].getTime())
    .map(c => c[0]);
  const bumps = (
    await MatchBumps.find({
      upload: { $in: otherMatches },
      division: "opn",
    })
      .sort({ date: 1 })
      .limit(0)
  )
    .filter(c => {
      const o = c.toObject<MatchBumpWithVirtuals>({ virtuals: true });
      return o.maybeEligible;
    })
    .map(c => c.upload);
  const allMatches = [/*...bumps,*/ matchUUID];
  console.log(`total = ${allMatches.length}`);
  let i = 0;
  for (const uuid of allMatches) {
    console.log(`rebumping ${uuid} ${i++}/${allMatches.length}`);
    await recalculateBumpForMatch(uuid);
  }
  process.exit(0);
};

rebump();
