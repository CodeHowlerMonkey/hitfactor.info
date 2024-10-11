import { Classifiers, singleClassifierExtendedMetaDoc } from "../api/src/db/classifiers";
import { connect } from "../api/src/db/index";
import { RecHHFs, rehydrateRecHHF } from "../api/src/db/recHHF";
import { allDivShortNames } from "../shared/constants/divisions";

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
    .map(classifier => allDivShortNames.map(div => [classifier, div].join(":")))
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
  await hydrate24Series();
};

migrate();
