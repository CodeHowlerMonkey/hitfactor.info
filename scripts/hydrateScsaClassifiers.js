import { connect } from "../api/src/db/index.js";
import { allDivShortNames, scsaDivisions } from "../shared/constants/divisions.js";
import { RecHHF, rehydrateRecHHF } from "../api/src/db/recHHF.js";
import {
  Classifier,
  singleClassifierExtendedMetaDoc,
} from "../api/src/db/classifiers.js";

const hydrateScsa = async () => {
  const scsaLongNames = scsaDivisions.map((x) => x.long);
  await rehydrateRecHHF(scsaLongNames, [
    "SC-101",
    "SC-102",
    "SC-103",
    "SC-104",
    "SC-105",
    "SC-106",
    "SC-107",
    "SC-108",
  ]);

  const classifierDivisions = [
    "SC-101",
    "SC-102",
    "SC-103",
    "SC-104",
    "SC-105",
    "SC-106",
    "SC-107",
    "SC-108",
  ]
    .map((classifier) => scsaLongNames.map((div) => [classifier, div].join(":")))
    .flat();

  const recHHFs = await RecHHF.find({ classifierDivision: { $in: classifierDivisions } })
    .select({ recHHF: true, _id: false, classifierDivision: true })
    .lean();
  const recHHFsByClassifierDivision = recHHFs.reduce((acc, cur) => {
    acc[cur.classifierDivision] = cur;
    return acc;
  }, {});

  let i = 0;
  for (const classifierDivision of classifierDivisions) {
    const [classifier, division] = classifierDivision.split(":");
    const doc = await singleClassifierExtendedMetaDoc(
      division,
      classifier,
      recHHFsByClassifierDivision[[classifier, division].join(":")]
    );
    await Classifier.bulkWrite([
      {
        updateOne: {
          filter: { division: doc.division, classifier: doc.classifier },
          update: { $set: doc },
          upsert: true,
        },
      },
    ]);
    ++i;
    process.stdout.write(`\r${i}/${classifierDivisions.length}`);
  }
};

const migrate = async () => {
  await connect();
  await hydrateScsa();
};

migrate();
