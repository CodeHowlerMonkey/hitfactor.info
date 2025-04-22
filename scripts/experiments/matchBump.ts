/* eslint-disable no-console */

import uniqBy from "lodash.uniqby";

import { connect } from "../../api/src/db";
import {
  MatchBumps,
  matchBumpsForMatchResults,
  saveMatchBumps,
} from "../../api/src/db/matchBumps";
import { MatchScores, MatchScoreVirtuals } from "../../api/src/db/matchScores";
import { MatchScore } from "../../data/types/MatchScore";
import { correlation, linearRegression } from "../../shared/utils/weibull";

const matchBump = async () => {
  await connect();
  const ms = await MatchScores.find({}).sort({ matchPercent: -1 }).limit(0);
  console.log(`results cursor: ${ms.length}`);

  const matchResultObjects = ms
    .filter(
      s =>
        s.shooterRecPercentHistorical! > 0 &&
        s.matchPercent > 0 &&
        !!s.shooterRecPercentHistoricalAge &&
        s.shooterRecPercentHistoricalAge <= 36,
    )
    .map(s => s.toObject({ virtuals: false })) as (MatchScore & MatchScoreVirtuals)[];
  console.log(`results objects filtered: ${matchResultObjects.length}`);
  process.exit(0);

  const points = matchResultObjects.map(({ matchPercent: y, shooterRecPercent: x }) => ({
    x,
    y,
  }));
  const { intercept, slope } = linearRegression(points);

  const withLR = matchResultObjects.map(
    ({ memberNumber, division, shooterRecPercent, matchPercent, shooter: { name } }) => ({
      memberNumber,
      name,
      division,
      shooterRecPercent,
      matchPercent,
      asClassifierPercent: (matchPercent - intercept) / slope,
    }),
  );
  const correl =
    correlation(
      points.map(c => c.x),
      points.map(c => c.y),
    ) * 100;
  console.error(`Correlation: ${correl.toFixed(2)}`);

  console.log(
    JSON.stringify(
      withLR.map(w =>
        [
          w.memberNumber,
          w.name,
          `${w.matchPercent}% Match`,
          `${w.asClassifierPercent.toFixed(2)}% Bump`,
          `${w.shooterRecPercent.toFixed(2)}% Rec`,
        ].join(" - "),
      ),
      null,
      2,
    ),
  );

  process.exit(0);
};

const eligibleMatchesGo = async () => {
  await connect();

  const matches = (
    await MatchBumps.find({
      filteredDataPoints: { $gte: 30 },
      filteredCorrelation: { $gte: 0.9 },
      $or: [{ filteredMasters: { $gte: 10 } }, { filteredGrandmasters: { $gte: 3 } }],
    })
  ).map(m => m.toObject());
  const matchesUUIDs = uniqBy(matches, c => c.uploadDivision);
  const matchesUploadDivisionMap = Object.fromEntries(
    matchesUUIDs.map(c => [c.uploadDivision, 1]),
  );

  const scores = (
    await MatchScores.find({
      matchPercent: { $gt: 0 },
      upload: { $in: matches.map(m => m.upload) },
    })
  ).filter(s => matchesUploadDivisionMap[[s.upload, s.division].join(":")] === 1);

  console.log(`eligible matches: ${Object.keys(matchesUploadDivisionMap).length}`);
  console.log(`eligible scores: ${scores.length}`);
  console.log(JSON.stringify(Object.keys(matchesUploadDivisionMap), null, 2));
  process.exit(0);
};

const fixUp = async () => {
  await connect();

  const eligibleMatches = await MatchBumps.find({
    filteredDataPoints: { $gte: 30 },
    filteredCorrelation: { $gte: 0.9 },
    $or: [{ filteredMasters: { $gte: 10 } }, { filteredGrandmasters: { $gte: 3 } }],
  }).limit(0);

  const uuids = uniqBy(
    eligibleMatches.map(c => c.upload),
    c => c,
  );
  console.log(uuids.length);

  for (const uuid of uuids) {
    const all = await MatchScores.find({ upload: uuid }).limit(0);
    const allObjs = all.map(c => c.toObject({ virtuals: true }));
    const bumps = matchBumpsForMatchResults(allObjs);
    await saveMatchBumps(bumps);
    console.log(`${all.length} => ${bumps.length}`);
  }
  process.exit(0);
};

fixUp();
