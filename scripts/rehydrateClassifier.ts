/* eslint-disable no-console */
import { Classifiers, singleClassifierExtendedMetaDoc } from "../api/src/db/classifiers";
import { connect } from "../api/src/db/index";
import { RecHHF, RecHHFs, rehydrateRecHHF } from "../api/src/db/recHHF";
import { allDivShortNames } from "../shared/constants/divisions";

// TODO: #79 convert to API + UI, add shooter reclassification
const rehydrateOneClassifier = async (classifier: string) => {
  console.log(`rehydrating rechhf for ${classifier}`);
  await rehydrateRecHHF(allDivShortNames, [classifier]);
  console.log("done");

  const classifierDivisions = [classifier]
    .map(c => allDivShortNames.map(div => [c, div].join(":")))
    .flat();

  console.log(`classifier-division pairs: ${classifierDivisions.join(", ")}`);

  const recHHFs = await RecHHFs.find({ classifierDivision: { $in: classifierDivisions } })
    .select({ recHHF: true, _id: false, classifierDivision: true })
    .lean();
  const recHHFsByClassifierDivision = recHHFs.reduce(
    (acc, cur) => {
      acc[cur.classifierDivision] = cur;
      return acc;
    },
    {} as Record<string, RecHHF>,
  );
  console.log(`recHHFs: \n${JSON.stringify(recHHFsByClassifierDivision, null, 2)}`);

  console.log("writing classifiers");
  let i = 0;
  for (const classifierDivision of classifierDivisions) {
    const [curClassifier, division] = classifierDivision.split(":");
    const doc = await singleClassifierExtendedMetaDoc(
      division,
      curClassifier,
      recHHFsByClassifierDivision[[curClassifier, division].join(":")],
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
  console.log("done");
};

const go = async () => {
  const classifier = process.argv[2];
  if (!classifier) {
    console.error("must specify classifier as CLI argument");
    process.exit(1);
  }

  await connect();
  await rehydrateOneClassifier(classifier);
  console.log("all done");

  process.exit(0);
};

go();
