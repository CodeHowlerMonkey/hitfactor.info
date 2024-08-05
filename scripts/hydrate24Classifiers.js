import { connect } from "../api/src/db/index.js";
import { allDivShortNames } from "../shared/constants/divisions.js";
import { RecHHF, rehydrateRecHHF } from "../api/src/db/recHHF.js";
import {
  Classifier,
  singleClassifierExtendedMetaDoc,
} from "../api/src/db/classifiers.js";

const hydrate24Series = async () => {
  await rehydrateRecHHF(allDivShortNames, [
    "24-01",
    "24-02",
    "24-04",
    "24-06",
    "24-08",
    "24-09",
  ]);

  const classifierDivisions = ["24-01", "24-02", "24-04", "24-06", "24-08", "24-09"]
    .map((classifier) => allDivShortNames.map((div) => [classifier, div].join(":")))
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
  await hydrate24Series();
};

migrate();
