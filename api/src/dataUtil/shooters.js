import one from "../../../data/mergedArray.classifications.1.json" assert { type: "json" };
import two from "../../../data/mergedArray.classifications.2.json" assert { type: "json" };
export const all = [...one, ...two];

import { divIdToShort } from "./divisions.js";

// TODO: use for shooters list / dataTable
export const shortAll = all
  //  .filter((c) => c.member_data.privacy === "0")
  .map((c) => ({
    memberNumber: c.member_data.member_number,
    name: [c.member_data.first_name, c.member_data.last_name].join(" "),
    //shit: c.classifications,
    classifications: c.classifications.reduce(
      (acc, c) => ({
        ...acc,
        [divIdToShort[c.division_id]]: c.class,
      }),
      {}
    ),
  }));

export const byMemberNumber = shortAll.reduce((acc, c) => {
  acc[c.memberNumber] = c;
  return acc;
}, {});

export const shooterShortInfo = ({ memberNumber, division }) => {
  try {
    const { classifications, ...info } = byMemberNumber[memberNumber];
    return {
      class: classifications[division],
      division,
      ...info,
    };
  } catch (err) {
    console.log(err);
    console.log(memberNumber);
    console.log(division);
  }

  // TODO: looks like the result of only fetching classifications for non-expired members
  // return this for now, but we might need to re-fetch these numbers for historical housekeeping
  return {
    class: "X",
    division,
    memberNumber,
    name: "Expired / Not Found",
  };
};
