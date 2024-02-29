import { extendedClassificationsInfo } from "./classifications.js";
import { N, Percent, PositiveOrMinus1 } from "./numbers.js";

import { divIdToShort, mapDivisions } from "./divisions.js";
import { divShortToShooterToRuns } from "./classifiers.js";

import { byMemberNumber } from "./byMemberNumber.js";
import { curHHFForDivisionClassifier } from "./hhf.js";
import { dateSort } from "../../../shared/utils/sort.js";

const scoresAge = (division, memberNumber) =>
  (divShortToShooterToRuns[division][memberNumber] ?? [])
    .filter((c) => c.code === "Y")
    .sort((a, b) => dateSort(a, b, "sd", -1))
    .slice(0, 4) // use 4 to decrease age, by allowing minimum number of classifiers that can result in classification
    .map((c) => (new Date() - new Date(c.sd)) / (28 * 24 * 60 * 60 * 1000)) // millisecconds to 28-day "months"
    .reduce((acc, curV, unusedIndex, arr) => acc + curV / arr.length, 0);

const shootersFullForDivision = (division) =>
  extendedClassificationsInfo
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
    .sort((a, b) => b.high - a.high) // sort by high to calculate highRank
    .map((c, index, all) => ({
      ...c,
      highRank: index,
      highPercentile: Percent(index, all.length),
    }))
    .sort((a, b) => b.current - a.current) // sort by current to calculate currentRank
    .map((c, index, all) => ({
      ...c,
      currentRank: index,
      currentPercentile: Percent(index, all.length),
      age: scoresAge(division, c.memberNumber),
      ages: mapDivisions((div) => scoresAge(div, c.memberNumber)),
    }));

// TODO: we can use all shooters, and all classifiers with HF if we recalculate everything
// against current HHFs... ://
const freshShootersForDivisionCalibration = (division, maxAge = 48) =>
  shootersFullForDivision(division) // sorted by current already
    .filter((c) => c.age > 0 && c.age <= maxAge)
    .map((c, index, all) => ({
      current: c.current,
      percentile: Percent(index, all.length),
      age: c.age,
      index,
    }));

export const classifiersForDivisionForShooter = ({ division, memberNumber }) =>
  (divShortToShooterToRuns[division][memberNumber] ?? []).map((run, index) => {
    const hhf = curHHFForDivisionClassifier({
      number: run.classifier,
      division,
    });
    const curPercent = PositiveOrMinus1(Percent(run.hf, hhf));
    const percentMinusCurPercent =
      curPercent >= 0 ? N(run.percent - curPercent) : -1;

    return { ...run, curPercent, percentMinusCurPercent, index };
  });

// TODO: just refactor the interface into a function and memoize it
// then just start cache warmup after port bind
export let extendedCalibrationShootersPercentileTable = {};
export let shootersTable = {};
export let shootersTableByMemberNumber = {};
setTimeout(() => {
  console.log("calculating shooters tables");
  extendedCalibrationShootersPercentileTable = mapDivisions((div) => ({
    pGM:
      freshShootersForDivisionCalibration(div).find((c) => c.current <= 95)
        ?.percentile || 1,
    pM:
      freshShootersForDivisionCalibration(div).find((c) => c.current <= 85)
        ?.percentile || 5,
    pA:
      freshShootersForDivisionCalibration(div).find((c) => c.current <= 75)
        ?.percentile || 15,
    // not gonna calculate these for now (slows down server start, not used in analysis)
    //    pB:
    //  freshShootersForDivisionCalibration(div).find((c) => c.current <= 60)
    //    ?.percentile || 40,
    //pC:
    //  freshShootersForDivisionCalibration(div).find((c) => c.current <= 40)
    //    ?.percentile || 90,
  }));

  shootersTable = {
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
  shootersTableByMemberNumber = {
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
  console.log("DONE calculating shooters tables");
}, 1000);

export const shooterFullInfo = ({ memberNumber, division }) => {
  try {
    return shootersTableByMemberNumber[division][memberNumber][0];
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

export const shooterChartData = ({ memberNumber, division }) =>
  classifiersForDivisionForShooter({ memberNumber, division })
    .map((run) => ({
      x: run.sd,
      curPercent: run.curPercent,
      percent: run.percent,
      classifier: run.classifier,
    }))
    .filter((run) => !!run.classifier); // no majors for now in the graph
