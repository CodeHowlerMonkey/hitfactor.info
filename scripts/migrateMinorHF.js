import { connect } from "../api/src/db/index";
import { Score } from "../api/src/db/scores";
import { consol } from "../shared/utils/consol";
import { minorHF } from "../shared/utils/hitfactor";

const migrateDivision = async (division = "opn") => {
  const possiblyCompatible = await Score.countDocuments({
    division,
    targetHits: { $exists: true },
  });

  let curBatch = [];
  let migratedCount = 0;
  do {
    curBatch = await Score.find({
      division,
      targetHits: { $exists: true },
      minorHF: { $exists: false },
    }).limit(200);

    migratedCount += curBatch.length;
    await Score.bulkWrite(
      curBatch.map((s) => ({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { minorHF: minorHF(s) } },
        },
      }))
    );
    console.log(`done ${migratedCount}/${possiblyCompatible} in ${division}`);
  } while (curBatch.length > 0);

  const migratedTotal = await Score.countDocuments({
    division,
    minorHF: { $exists: true, $gt: 0 },
  });
  console.log(`migrated ${migratedTotal}/${possiblyCompatible} in ${division}`);
};

// TODO: migrate l10, ss, rev; for counting it only (not for recHHF)

// For HFU divisions we need to recalculate opn and ltd into minor hf as recHHF source
// for classifications in irn we also need to prep minorHF in l10/ss/rev
//
// TODO: make minorHF automatic on upload, but right now just re-migrate, should be increment safe
const migrate = async () => {
  await connect();

  const total = await Score.countDocuments({});
  const possible = await Score.countDocuments({ minorHF: { $exists: true } });
  const migrated = await Score.countDocuments({ minorHF: { $exists: true, $ne: -1 } });
  consol({ total, possible, migrated });

  await migrateDivision("opn");
  await migrateDivision("ltd");
  await migrateDivision("l10");
  await migrateDivision("ss");
  await migrateDivision("rev");
};

migrate();
