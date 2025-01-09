/* eslint-disable no-console */
import { uspsaClassifiers } from "../api/src/dataUtil/classifiersData";
import { connect } from "../api/src/db/index";
import { Scores } from "../api/src/db/scores";
import { uspsaDivShortNames } from "../shared/constants/divisions";

const go = async () => {
  await connect();

  const classifiers = uspsaClassifiers;
  const divisions = uspsaDivShortNames;

  const result = {};
  for (const division of divisions) {
    result[division] = {};
    for (const classifier of classifiers) {
      const curScores = await Scores.find({
        classifier,
        division,
        hf: { $gt: 0 },
        bad: { $ne: true },
      })
        .sort({ hf: -1 })
        .select({ hf: 1, _id: 0 })
        .limit(0)
        .lean();
      result[division][classifier] = curScores.map(({ hf }) => hf);
    }
  }
  console.log(JSON.stringify(result));
  process.exit(0);
};

go();
