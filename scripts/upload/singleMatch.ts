/* eslint-disable no-console */
import { connect } from "../../api/src/db/index";
import { Matches, matchFromMatchDef } from "../../api/src/db/matches";
import {
  fetchPS,
  metaLoop,
  // hitFactorLikeMatchInfo,
  uploadMatches,
} from "../../api/src/worker/uploads";

const go = async () => {
  const matchUUID = process.argv[2];
  const matchTemplateName = process.argv[2];
  if (!matchUUID || !matchTemplateName) {
    console.error("must provide match name and templateName");
    process.exit(1);
  }

  const { matchDef } = await fetchPS(matchUUID);
  const match = matchFromMatchDef(matchDef, process.argv[3]);
  console.log(JSON.stringify(match, null, 2));
  await connect();
  if (!match?.name) {
    console.error("bad match");
    process.exit(1);
  }
  await Matches.bulkWrite([
    {
      updateOne: {
        filter: {
          uuid: match.uuid,
        },
        update: { $set: match },
        upsert: true,
      },
    },
  ]);

  /*
  const shit = hitFactorLikeMatchInfo(match, { matchDef, results, scores }, false, false);
  console.log(JSON.stringify(shit.scores, null, 2));
  */

  const upload = await uploadMatches({ matches: [match] });
  console.log(JSON.stringify(upload, null, 2));
  await Matches.bulkWrite(
    [match].map(m => ({
      updateOne: {
        filter: { uuid: m.uuid },
        update: {
          $set: {
            uploaded: new Date(),
            hasScores: true,
          },
        },
      },
    })),
  );
  console.error("marked match as uploaded");
  await metaLoop(false);

  console.error("done");
  process.exit(0);
};

go();
