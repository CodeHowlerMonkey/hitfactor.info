import one from "../../../data/mergedArray.classifications.1.json" assert { type: "json" };
import two from "../../../data/mergedArray.classifications.2.json" assert { type: "json" };
export const all = [...one, ...two];
import { Percent } from "./numbers.js";

import { divIdToShort } from "./divisions.js";

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

export const fullAll = all
  //  .filter((c) => c.member_data.privacy === "0")
  .map((c) => ({
    memberNumber: c.member_data.member_number,
    name: [c.member_data.first_name, c.member_data.last_name].join(" "),
    classifications: c.classifications.reduce(
      (acc, c) => ({
        ...acc,
        [divIdToShort[c.division_id]]: c.class,
      }),
      {}
    ),
    high: c.classifications.reduce(
      (acc, c) => ({
        ...acc,
        [divIdToShort[c.division_id]]: Number(c.high_percent),
      }),
      {}
    ),
    current: c.classifications.reduce(
      (acc, c) => ({
        ...acc,
        [divIdToShort[c.division_id]]: Number(c.current_percent),
      }),
      {}
    ),
  }));

export const byMemberNumber = shortAll.reduce((acc, c) => {
  acc[c.memberNumber] = c;
  return acc;
}, {});

export const byMemberNumberFull = fullAll.reduce((acc, c) => {
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

export const shooterFullInfo = ({ memberNumber, division }) => {
  try {
    const { classifications, high, current, ...info } =
      byMemberNumberFull[memberNumber];
    return {
      class: classifications[division],
      high: high[division],
      current: current[division],
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
    high: 0,
    current: 0,
    division,
    memberNumber,
    name: "Expired / Not Found",
  };
};

const shootersFullForDivision = (division) =>
  fullAll
    .map((c) => {
      const { classifications, high, current, ...etc } = c;
      try {
        return {
          ...etc,
          class: classifications?.[division],
          high: high?.[division],
          current: current?.[division],
          division,
        };
      } catch (err) {
        console.log(err);
        console.log(memberNumber);
        console.log(division);
      }

      return {
        ...c,
        class: "X",
        high: 0,
        current: 0,
        division,
        name: "Expired / Not Found",
      };
    })
    .filter((c) => c.class !== "U")
    .sort((a, b) => b.high - a.high)
    .map((c, index, all) => ({
      ...c,
      highPercentile: Percent(index, all.length),
    }))
    .sort((a, b) => b.current - a.current)
    .map((c, index, all) => ({
      ...c,
      currentPercentile: Percent(index, all.length),
    }));

export const shootersTable = {
  opn: shootersFullForDivision("opn"),
  ltd: shootersFullForDivision("ltd"),
  l10: shootersFullForDivision("l10"),
  prod: shootersFullForDivision("prod"),
  ss: shootersFullForDivision("ss"),
  rev: shootersFullForDivision("rev"),
  co: shootersFullForDivision("co"),
  pcc: shootersFullForDivision("pcc"),
  lo: shootersFullForDivision("lo"),
};
