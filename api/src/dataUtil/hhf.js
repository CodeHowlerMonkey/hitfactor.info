import { classifiers, scsaHhfEquivalentForDivision, scsaPeakTime } from "./classifiersData.js";
import { divIdToShort, hfuDivisionMapForHHF } from "./divisions.js";
import { HF } from "./numbers.js";
import { loadJSON } from "../utils.js";

export const divShortToHHFs = loadJSON("../../data/hhf.json").hhfs.reduce((acc, cur) => {
  const divShortName = divIdToShort[cur.division];
  const curArray = acc[divShortName] || [];

  return {
    ...acc,
    [divShortName]: [...curArray, cur],
  };
}, {});

export const hhfsForDivision = (division) => {
  if (division.startsWith('scsa')) {
    return scsaHhfEquivalentForDivision(division);
  }
  const hfuDivisionForHHF = hfuDivisionMapForHHF[division];
  if (hfuDivisionForHHF) {
    return divShortToHHFs[hfuDivisionForHHF];
  }

  return divShortToHHFs[division];
};

export const curHHFForDivisionClassifier = ({ division, number }) => {
  if (!number) {
    return NaN;
  }

  const divisionHHFs = hhfsForDivision(division);
  const c = classifiers.find((cur) => cur.classifier === number);

  // major match or classifier not found for some reason
  if (!c) {
    return NaN;
  }

  try {
    const curHHFInfo = divisionHHFs.find((dHHF) => dHHF.classifier === c.id);
    return HF(curHHFInfo.hhf);
  } catch (all) {
    console.log("cant find HHF for division:");
    console.log(division);
    return -1;
  }
};
export const curHHFFor = ({ division, classifier }) =>
  curHHFForDivisionClassifier({ division, number: classifier });
