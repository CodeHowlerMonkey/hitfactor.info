import { classifiers } from "./classifiersData.js";
import { divIdToShort } from "./divisions.js";
import { HF } from "./numbers.js";
import { loadJSON } from "../utils.js";

export const divShortToHHFs = loadJSON("../../data/hhf.json").hhfs.reduce(
  (acc, cur) => {
    const divShortName = divIdToShort[cur.division];
    const curArray = acc[divShortName] || [];

    // TODO: merge HHF for LO/CO in a smart way
    let extra = {};
    if (divShortName === "lo") {
      extra = { loco: [...curArray, cur] };
    }

    return {
      ...acc,
      [divShortName]: [...curArray, cur],
      ...extra,
    };
  },
  {}
);

// TODO: refactor to divShortToClassifierNumbertoHHF
export const curHHFForDivisionClassifier = ({ division, number }) => {
  if (!number) {
    return NaN;
  }

  const divisionHHFs = divShortToHHFs[division];
  const c = classifiers.find((cur) => cur.classifier === number);

  // major match or classifier not found for some reason
  if (!c) {
    return NaN;
  }

  const curHHFInfo = divisionHHFs.find((dHHF) => dHHF.classifier === c.id);
  return HF(curHHFInfo.hhf);
};
