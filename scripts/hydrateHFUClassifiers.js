import uniqBy from "lodash.uniqby";
import { connect } from "../api/src/db/index.js";
import { uspsaClassifiers } from "../api/src/dataUtil/classifiersData.js";
import { hfuDivisionsShortNames } from "../shared/constants/divisions.js";
import { RecHHF } from "../api/src/db/recHHF.js";
import {
  Classifier,
  singleClassifierExtendedMetaDoc,
} from "../api/src/db/classifiers.js";

const hydrateHFUClassifiers = async () => {
  const classifiers = uspsaClassifiers
    .map((classifier) =>
      hfuDivisionsShortNames.map((division) => ({
        classifier,
        division,
      }))
    )
    .flat();

  const recHHFs = await RecHHF.find({
    classifierDivision: {
      $in: classifiers.map((c) => [c.classifer, c.division].join(":")),
    },
  })
    .select({ recHHF: true, _id: false, classifierDivision: true })
    .lean();
  const recHHFsByClassifierDivision = recHHFs.reduce((acc, cur) => {
    acc[cur.classifierDivision] = cur;
    return acc;
  }, {});

  let i = 0;
  for (const classifierObj of classifiers) {
    const { classifier, division } = classifierObj;
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
    process.stdout.write(`\r${i}/${classifiers.length}`);
  }
};

const migrate = async () => {
  await connect();
  await hydrateHFUClassifiers();
};

migrate();
