import { all } from "./classifications.js";
import { N, Percent, PositiveOrMinus1 } from "./numbers.js";

import { divIdToShort } from "./divisions.js";
import { divShortToShooterToRuns } from "./classifiers.js";

import { byMemberNumber } from "./byMemberNumber.js";
import { curHHFForDivisionClassifier } from "./hhf.js";

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
    data: c.member_data,
    memberNumber: c.member_data.member_number,
    name: [
      c.member_data.first_name,
      c.member_data.last_name,
      c.member_data.suffix,
    ]
      .filter(Boolean)
      .join(" "),
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

export const shortByMemberNumber = shortAll.reduce((acc, c) => {
  acc[c.memberNumber] = c;
  return acc;
}, {});

export const byMemberNumberFull = fullAll.reduce((acc, c) => {
  acc[c.memberNumber] = c;
  return acc;
}, {});

export const shooterShortInfo = ({ memberNumber, division }) => {
  try {
    const { classifications, ...info } = shortByMemberNumber[memberNumber];
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
      classes: classifications,
      division,
      high: high[division],
      current: current[division],
      highs: high,
      currents: current,
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
          classes: classifications,
          high: high?.[division],
          current: current?.[division],
          highs: high,
          currents: current,
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
      highRank: index,
      highPercentile: Percent(index, all.length),
    }))
    .sort((a, b) => b.current - a.current)
    .map((c, index, all) => ({
      ...c,
      currentRank: index,
      currentPercentile: Percent(index, all.length),
      classifiers: (
        divShortToShooterToRuns[division][c.memberNumber] ?? []
      ).map((run, index) => {
        const hhf = curHHFForDivisionClassifier({
          number: run.classifier,
          division,
        });
        const curPercent = PositiveOrMinus1(Percent(run.hf, hhf));
        const percentMinusCurPercent =
          curPercent >= 0 ? N(run.percent - curPercent) : -1;

        return { ...run, curPercent, percentMinusCurPercent, index };
      }),
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

export const shootersTableByMemberNumber = {
  opn: byMemberNumber(shootersTable.opn),
  ltd: byMemberNumber(shootersTable.ltd),
  l10: byMemberNumber(shootersTable.l10),
  prod: byMemberNumber(shootersTable.prod),
  ss: byMemberNumber(shootersTable.ss),
  rev: byMemberNumber(shootersTable.rev),
  co: byMemberNumber(shootersTable.co),
  lo: byMemberNumber(shootersTable.lo),
  pcc: byMemberNumber(shootersTable.pcc),
};

export const shooterChartData = ({ memberNumber, division, y }) => {
  // monke done fucked up, monke doesn't know why it has to use [0], monke dum
  let runs = shootersTableByMemberNumber[division][memberNumber][0].classifiers;
  return runs
    .map((run) => ({
      x: run.sd,
      curPercent: run.curPercent,
      percent: run.percent,
      classifier: run.classifier,
    }))
    .filter((run) => !!run.classifier); // no majors for now in the graph
};
