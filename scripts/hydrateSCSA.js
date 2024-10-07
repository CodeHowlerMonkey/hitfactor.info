import { Classifiers, singleClassifierExtendedMetaDoc } from "../api/src/db/classifiers";
import { connect } from "../api/src/db/index";
import { Matches } from "../api/src/db/matches";
import { RecHHFs, rehydrateRecHHF } from "../api/src/db/recHHF";
import { uploadLoop } from "../api/src/worker/uploads";
import { scsaDivisionsShortNames } from "../shared/constants/divisions";

const hydrateScsaClassifiers = async () => {
  await rehydrateRecHHF(scsaDivisionsShortNames, [
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
    .map(classifier => scsaDivisionsShortNames.map(div => [classifier, div].join(":")))
    .flat();

  const recHHFs = await RecHHFs.find({ classifierDivision: { $in: classifierDivisions } })
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
      recHHFsByClassifierDivision[[classifier, division].join(":")],
    );
    await Classifiers.bulkWrite([
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

  console.log("marking all SCSA as not uploaded");
  const matchesUpdate = await Matches.updateMany(
    { templateName: "Steel Challenge" },
    { $unset: { uploaded: true } },
  );
  console.log("matchesResult = ");
  console.log(JSON.stringify(matchesUpdate, null, 2));

  await uploadLoop({ skipAfterUploadHydration: true, batchSize: 20 });
  await hydrateScsaClassifiers();
};

migrate();
