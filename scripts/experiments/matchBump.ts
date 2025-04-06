/* eslint-disable no-console */

import { connect } from "../../api/src/db";
import { matchFromMatchDef } from "../../api/src/db/matches";
import {
  MatchScore,
  MatchScores,
  MatchScoreVirtuals,
} from "../../api/src/db/matchScores";
import { uploadResultsForMatches } from "../../api/src/worker/uploads";
import { fetchPS } from "../../api/src/worker/uploadsCommon";
import { correlation, linearRegression } from "../../shared/utils/weibull";

const matchBump = async () => {
  await connect();
  const ms = await MatchScores.find({
    //upload: "12d1cd35-3556-44db-af09-5153f975c447", conats
    // upload: "27c0c577-315b-4695-a595-26e5d51cee6c", // random match, 91% correlation
    // upload: "7eb1154b-ccb7-4589-95a2-99120b234d32", // utah state 2024
    upload: "fc8c7dee-900c-4e3c-b7f9-0fc8cde9e7d5", //slpsa
    division: "co",
  })
    .populate("shooter")
    .sort({ matchPercent: -1 });

  const matchResultObjects = ms
    .filter(s => s.shooterRecPercent > 0)
    .filter(s => s.matchPercent > 10)
    .map(s => s.toObject({ virtuals: true })) as (MatchScore & MatchScoreVirtuals)[];

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

const go = async () => {
  const matchUUID = process.argv[2];
  const matchTemplateName = process.argv[3];
  if (!matchUUID || !matchTemplateName) {
    console.error("must provide match name and templateName");
    process.exit(1);
  }

  const s3Files = await fetchPS(matchUUID);
  const { matchDef, results } = s3Files;
  console.log(JSON.stringify({ results }, null, 2));
  const match = matchFromMatchDef(matchDef, matchTemplateName);

  if (!match?.name) {
    console.error("bad match");
    process.exit(1);
  }

  const uploadResults = await uploadResultsForMatches([match]);
  const { scores, matchResults } = uploadResults;
  console.log(JSON.stringify({ scores, matchResults }, null, 2));
  process.exit(0);
};

matchBump();
