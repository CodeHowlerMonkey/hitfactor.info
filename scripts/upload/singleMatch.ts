/* eslint-disable no-console */
import { connect } from "../../api/src/db/index";
import { Matches, matchFromMatchDef } from "../../api/src/db/matches";
import { fetchPS, metaLoop, uploadMatches } from "../../api/src/worker/uploads";

const go = async () => {
  const matchUUID = process.argv[2];
  const matchTemplateName = process.argv[3];
  if (!matchUUID) {
    console.error("must provide match uuid");
    process.exit(1);
  }

  const { matchDef } = await fetchPS(matchUUID);
  const match = matchFromMatchDef(matchDef, matchTemplateName);
  console.log(JSON.stringify(match, null, 2));
  if (!match?.name) {
    console.error("bad match");
    process.exit(1);
  }
  await connect();
  console.error("Saving match...");
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

  console.error("Uploading scores...");
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
  await metaLoop();

  console.error("done");
  process.exit(0);
};

go();
