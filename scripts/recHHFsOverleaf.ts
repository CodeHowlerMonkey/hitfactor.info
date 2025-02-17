/* eslint-disable no-console */

import { deprecatedUSPSAClassifiers } from "../api/src/dataUtil/classifiersData";
import { Classifiers } from "../api/src/db/classifiers";
import { connect } from "../api/src/db/index";
import { uspsaDivShortNames } from "../shared/constants/divisions";

const classifiersForDivision = async (division: string) =>
  Classifiers.find({
    division,
    classifier: { $nin: deprecatedUSPSAClassifiers },
  }).populate("recHHFs");

const go = async () => {
  await connect();

  for (const division of uspsaDivShortNames) {
    console.log("");
    console.log(`<${division}>`);
    const classifiers = await classifiersForDivision(division);
    classifiers.forEach(({ classifier, name, recHHFs: { curHHF, recHHF } }) => {
      console.log(
        `    ${classifier} ${name.replace("#", "\\#").replace("&", "\\&")} & ${recHHF.toFixed(4)} & ${curHHF.toFixed(4)} & ${(recHHF - curHHF).toFixed(4)} \\\\`,
      );
      console.log("    \\hline");
    });
    console.log(`</${division}>`);
  }

  console.error("\ndone");
  process.exit(0);
};

go();
