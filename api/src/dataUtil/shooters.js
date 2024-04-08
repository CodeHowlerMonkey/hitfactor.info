import memoize from "memoize";

import { Percent } from "./numbers.js";
import { mapDivisions } from "./divisions.js";
import { byMemberNumber } from "./byMemberNumber.js";

import { dateSort } from "../../../shared/utils/sort.js";
import { lazy } from "../utils.js";
import { classForPercent } from "../../../shared/utils/classification.js";
import { Score } from "../db/scores.js";

const scoresAge = (division, memberNumber, maxScores = 4) =>
  (getDivShortToShooterToRuns()[division][memberNumber] ?? [])
    .filter((c) => c.code === "Y")
    .sort((a, b) => dateSort(a, b, "sd", -1))
    .slice(0, maxScores) // use 4 to decrease age, by allowing minimum number of classifiers that can result in classification
    .map((c) => (new Date() - new Date(c.sd)) / (28 * 24 * 60 * 60 * 1000)) // millisecconds to 28-day "months"
    .reduce((acc, curV, unusedIndex, arr) => acc + curV / arr.length, 0);

const reclassificationBreakdown = (reclassificationInfo, division) => {
  const high = reclassificationInfo?.[division]?.highPercent;
  const current = reclassificationInfo?.[division]?.percent;
  return {
    class: classForPercent(current),
    classes: mapDivisions((div) =>
      classForPercent(reclassificationInfo?.[div]?.percent)
    ),
    highClass: classForPercent(high),
    highClasses: mapDivisions((div) =>
      classForPercent(reclassificationInfo?.[div]?.highPercent)
    ),
    high,
    current: reclassificationInfo?.[division]?.percent,
    highs: mapDivisions((div) => reclassificationInfo?.[div]?.highPercent),
    currents: mapDivisions((div) => reclassificationInfo?.[div]?.percent),
  };
};

const classificationsBreakdownAdapter = (c, division) => {
  const {
    classifications,
    reclassificationsByCurPercent,
    reclassificationsByRecPercent,
    high,
    current,
    ...etc
  } = c;
  try {
    const reclassificationsCurPercent = reclassificationBreakdown(
      reclassificationsByCurPercent,
      division
    );
    const reclassificationsRecPercent = reclassificationBreakdown(
      reclassificationsByRecPercent,
      division
    );

    const reclassificationsCurPercentCurrent = Number(
      (reclassificationsCurPercent?.current ?? 0).toFixed(4)
    );
    const reclassificationsRecPercentCurrent = Number(
      (reclassificationsRecPercent?.current ?? 0).toFixed(4)
    );

    const hqClass = classifications?.[division];
    const hqCurrent = current?.[division];
    const hqToCurHHFPercent = hqCurrent - reclassificationsCurPercentCurrent;
    const hqToRecPercent = hqCurrent - reclassificationsRecPercentCurrent;

    return {
      ...etc,
      class: classifications?.[division],
      classes: classifications,
      high: high?.[division],
      current: hqCurrent,
      highs: high,
      currents: current,
      // needs to be not-deep for sort
      reclassificationsCurPercentCurrent,
      reclassificationsRecPercentCurrent,
      reclassificationChange:
        reclassificationsRecPercentCurrent - reclassificationsCurPercentCurrent,
      reclassifications: {
        curPercent: reclassificationsCurPercent,
        recPercent: reclassificationsRecPercent,
      },
      hqClass,
      curHHFClass: reclassificationsCurPercent.class,
      recClass: reclassificationsRecPercent.class,
      hqToCurHHFPercent,
      hqToRecPercent,
      division,
    };
  } catch (err) {
    console.log(err);
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
};

const safeNumSort = (field) => (a, b) => {
  // sort by current to calculate currentRank
  // have to use Max and || 0 because U/X shooters need to be in the
  // output here (used in shooter info head), but can't mess up the
  // ranking due to null/-1/undefined values
  // note: || is used instead of ?? to convert NaN to 0 as well
  const aValue = field ? a[field] : a;
  const bValue = field ? b[field] : b;
  return Math.max(0, bValue || 0) - Math.max(0, aValue || 0);
};

const getShootersFullForDivision = memoize(
  (division) => {
    return (
      getExtendedClassificationsInfo()
        .map((c) => classificationsBreakdownAdapter(c, division))
        //        .filter((c) => c.class !== "U" && c.class !== "X")
        .sort(safeNumSort("high")) // sort by high to calculate highRank
        .map((c, index, all) => ({
          ...c,
          highRank: index,
          highPercentile: Percent(index, all.length),
        }))
        .sort(safeNumSort("current"))
        .map((c, index, all) => ({
          ...c,
          currentRank: index,
          currentPercentile: Percent(index, all.length),
          // TODO: move age calculation to calculateUSPSAClassification
          // should be cheaper and more precise for curHHF/recHHF modes
          age: c.ages[div],
          age1: c.age1s[div],
          ages: c.ages,
        }))
    );
  },
  { cacheKey: ([division]) => division }
);

export const getShootersTable = lazy(() => {
  const co = getShootersFullForDivision("co");
  const lo = getShootersFullForDivision("lo");

  return {
    opn: getShootersFullForDivision("opn"),
    ltd: getShootersFullForDivision("ltd"),
    l10: getShootersFullForDivision("l10"),
    prod: getShootersFullForDivision("prod"),
    ss: getShootersFullForDivision("ss"),
    rev: getShootersFullForDivision("rev"),
    co,
    pcc: getShootersFullForDivision("pcc"),
    lo,
    loco: [].concat(lo, co),
  };
}, "../../cache/shootersTable.json");

export const getShootersTableByMemberNumber = lazy(() => {
  const shootersTable = getShootersTable();
  return {
    opn: byMemberNumber(shootersTable.opn),
    ltd: byMemberNumber(shootersTable.ltd),
    l10: byMemberNumber(shootersTable.l10),
    prod: byMemberNumber(shootersTable.prod),
    ss: byMemberNumber(shootersTable.ss),
    rev: byMemberNumber(shootersTable.rev),
    co: byMemberNumber(shootersTable.co),
    lo: byMemberNumber(shootersTable.lo),
    pcc: byMemberNumber(shootersTable.pcc),
    loco: byMemberNumber(shootersTable.loco),
  };
}, "../../cache/shootersTableByMemberNumber.json");

export const getShooterFullInfo = ({ memberNumber, division }) => {
  try {
    const shootersTableByMemberNumber = getShootersTableByMemberNumber();
    return shootersTableByMemberNumber[division][memberNumber][0];
  } catch (err) {
    /*
    console.log(err);
    console.log(memberNumber);
    console.log(division);
    */
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

export const shooterDistributionChartData = ({ division }) =>
  getShootersTable()
    [division].filter((c) => {
      if (!c.current || !c.reclassificationsCurPercentCurrent) {
        return false;
      }
      return true;
    })
    .map((c, i, all) => ({
      //y: (100 * i) / (all.length - 1),
      curPercent: c.current,
      curHHFPercent: c.reclassificationsCurPercentCurrent,
      recPercent: c.reclassificationsRecPercentCurrent,
      memberNumber: c.memberNumber,
    }))
    .sort(safeNumSort("curPercent"))
    .map((c, i, all) => ({
      ...c,
      curPercentPercentile: (100 * i) / (all.length - 1),
    }))
    .sort(safeNumSort("curHHFPercent"))
    .map((c, i, all) => ({
      ...c,
      curHHFPercentPercentile: (100 * i) / (all.length - 1),
    }))
    .sort(safeNumSort("recPercent"))
    .map((c, i, all) => ({
      ...c,
      recPercentPercentile: (100 * i) / (all.length - 1),
    }));
