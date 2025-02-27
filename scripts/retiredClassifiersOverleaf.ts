/* eslint-disable no-console */

import { deprecatedUSPSAClassifiers } from "../api/src/dataUtil/classifiersData";
import { Classifier, Classifiers, ClassifierVirtuals } from "../api/src/db/classifiers";
import { connect } from "../api/src/db/index";

export const allDivisionClassifiersQuality = async () => {
  const [coDB, opnDB, ltdDB, pccDB] = await Promise.all([
    Classifiers.find({
      division: "co",
      classifier: { $in: deprecatedUSPSAClassifiers },
    }).populate("recHHFs"),
    Classifiers.find({
      division: "opn",
      classifier: { $in: deprecatedUSPSAClassifiers },
    }).populate("recHHFs"),
    Classifiers.find({
      division: "ltd",
      classifier: { $in: deprecatedUSPSAClassifiers },
    }).populate("recHHFs"),
    Classifiers.find({
      division: "pcc",
      classifier: { $in: deprecatedUSPSAClassifiers },
    }).populate("recHHFs"),
  ]);

  const co: (Classifier & ClassifierVirtuals)[] = coDB.map(c =>
    c.toObject({ virtuals: true }),
  );
  const opn = opnDB
    .map(c => c.toObject({ virtuals: true }))
    .reduce((acc, cur) => {
      acc[cur.classifier] = cur;
      return acc;
    }, {});
  const ltd = ltdDB
    .map(c => c.toObject({ virtuals: true }))
    .reduce((acc, cur) => {
      acc[cur.classifier] = cur;
      return acc;
    }, {});
  const pcc = pccDB
    .map(c => c.toObject({ virtuals: true }))
    .reduce((acc, cur) => {
      acc[cur.classifier] = cur;
      return acc;
    }, {});

  return co.reduce((acc, c) => {
    const id = c.classifier;
    acc[id] = {
      name: c.name,
      opn: opn[id].ccQuality,
      ltd: ltd[id].ccQuality,
      co: c.ccQuality,
      pcc: pcc[id].ccQuality,
    };
    return acc;
  }, {});
};

const go = async () => {
  await connect();

  const classifiersQualityMap = await allDivisionClassifiersQuality();
  deprecatedUSPSAClassifiers.forEach(classifier => {
    const { opn, ltd, co, pcc, name } = classifiersQualityMap[classifier];

    console.log(
      `    ${classifier} ${name.replace("#", "\\#").replace("&", "\\&")} & ${opn.toFixed(2)} & ${ltd.toFixed(2)} & ${co.toFixed(2)} & ${pcc.toFixed(2)} \\\\`,
    );
    console.log("    \\hline");
  });

  console.error("\ndone");
  process.exit(0);
};

go();
