/* eslint-disable no-console */

import { connect } from "@api/db";
import { Shooters } from "@api/db/shooters";
import { loadAllJSONFromDir } from "@api/utils";
import { classForPercent } from "@shared/classification/brackets";
import { uspsaDivIdToShort } from "@shared/constants/divisions";

const shooters = loadAllJSONFromDir("../../data/uspsa/classifications")
  .map(c => {
    const memberNumber = c.member_number;

    return Object.keys(c.classification).map(divId => {
      const division = uspsaDivIdToShort[divId];
      return {
        memberNumber,
        memberNumberDivision: [memberNumber, division].join(":"),
        division,
        current: Number(c.classification[divId].current_percent) || 0,
        high: Number(c.classification[divId].high_percent) || 0,
      };
    });
  })
  .flat();

console.log("JSON Files Loaded");
console.log(`${shooters.length} Shooters`);
console.log(JSON.stringify(shooters.find(s => s.current > 95 && s.current !== s.high)));

const go = async () => {
  await connect();

  console.error(`Total Shooters to Hydrate: ${shooters.length}`);

  const batchSize = 2048;
  for (let i = 0; i < shooters.length; i += batchSize) {
    const batch = shooters.slice(i, i + batchSize);
    const updates = batch
      .map(({ memberNumberDivision, memberNumber, division, current, high }) => {
        if (!memberNumberDivision || !memberNumber || !division) {
          return [];
        }

        const classCurrent = classForPercent(current);
        const classHigh = classForPercent(high);

        return [
          {
            updateOne: {
              filter: { memberNumberDivision },
              update: [
                {
                  $set: {
                    current,
                    high,
                    classCurrent,
                    classHigh,
                  },
                },
              ],
              upsert: true,
            },
          },
        ];
      })
      .flat();
    await Shooters.bulkWrite(updates.filter(Boolean));
    console.log(`done ${i}/${shooters.length}`);
  }

  console.error("\ndone, now run rehydrateForCC");
  process.exit(0);
};

go();
