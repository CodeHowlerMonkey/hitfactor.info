import { all } from "./dataUtil/shooters.js";

export { all };

const classificationRank = (classification) =>
  ["X", "U", "D", "C", "B", "A", "M", "GM"].indexOf(classification);
const hasClassification = (classification) =>
  ["D", "C", "B", "A", "M", "GM"].indexOf(classification) !== -1;

const divisions = [
  "Open", // 2
  "Limited", // 3
  "Limited 10", // 4
  "Production", // 5
  "Revolver", // 6
  "Single Stack", // 7
  "Carry Optics", // 35
  "PCC", // 38
  "Limited Optics", // 41
  // LO/CO 411
];

const highestClassification = (classificationObj) =>
  classificationObj
    .map((curObj) => curObj.class)
    .reduce((prev, curClass) => {
      if (classificationRank(prev) >= classificationRank(curClass)) {
        return prev;
      } else {
        return curClass;
      }
    }, undefined);

const selectDivision = (division, classifications) => {
  if (division) {
    return classifications.filter((curClass) => curClass.division === division);
  }
  return classifications;
};

export const highestClassificationCountsFor = (division) => {
  const highestClassifications = all
    .map((cur) =>
      highestClassification(selectDivision(division, cur.classifications))
    )
    .filter(Boolean);
  const highestClassificationCounts = new Map();
  highestClassificationCounts.set("U", 0);
  highestClassificationCounts.set("D", 0);
  highestClassificationCounts.set("C", 0);
  highestClassificationCounts.set("B", 0);
  highestClassificationCounts.set("A", 0);
  highestClassificationCounts.set("M", 0);
  highestClassificationCounts.set("GM", 0);
  for (let cur of highestClassifications) {
    const curNum = highestClassificationCounts.get(cur) ?? 0;
    highestClassificationCounts.set(cur, curNum + 1);
  }
  return highestClassificationCounts;
};

const staticInefficientlyCalculatedDataButIDGAF = {
  All: {
    U: highestClassificationCountsFor().get("U"),
    D: highestClassificationCountsFor().get("D"),
    C: highestClassificationCountsFor().get("C"),
    B: highestClassificationCountsFor().get("B"),
    A: highestClassificationCountsFor().get("A"),
    M: highestClassificationCountsFor().get("M"),
    GM: highestClassificationCountsFor().get("GM"),
  },
  Open: {
    // 2
    U: highestClassificationCountsFor("Open").get("U"),
    D: highestClassificationCountsFor("Open").get("D"),
    C: highestClassificationCountsFor("Open").get("C"),
    B: highestClassificationCountsFor("Open").get("B"),
    A: highestClassificationCountsFor("Open").get("A"),
    M: highestClassificationCountsFor("Open").get("M"),
    GM: highestClassificationCountsFor("Open").get("GM"),
  },
  Limited: {
    // 3
    U: highestClassificationCountsFor("Limited").get("U"),
    D: highestClassificationCountsFor("Limited").get("D"),
    C: highestClassificationCountsFor("Limited").get("C"),
    B: highestClassificationCountsFor("Limited").get("B"),
    A: highestClassificationCountsFor("Limited").get("A"),
    M: highestClassificationCountsFor("Limited").get("M"),
    GM: highestClassificationCountsFor("Limited").get("GM"),
  },
  "Limited 10": {
    // 4
    U: highestClassificationCountsFor("Limited 10").get("U"),
    D: highestClassificationCountsFor("Limited 10").get("D"),
    C: highestClassificationCountsFor("Limited 10").get("C"),
    B: highestClassificationCountsFor("Limited 10").get("B"),
    A: highestClassificationCountsFor("Limited 10").get("A"),
    M: highestClassificationCountsFor("Limited 10").get("M"),
    GM: highestClassificationCountsFor("Limited 10").get("GM"),
  },
  Production: {
    // 5
    U: highestClassificationCountsFor("Production").get("U"),
    D: highestClassificationCountsFor("Production").get("D"),
    C: highestClassificationCountsFor("Production").get("C"),
    B: highestClassificationCountsFor("Production").get("B"),
    A: highestClassificationCountsFor("Production").get("A"),
    M: highestClassificationCountsFor("Production").get("M"),
    GM: highestClassificationCountsFor("Production").get("GM"),
  },
  Revolver: {
    // 6
    U: highestClassificationCountsFor("Revolver").get("U"),
    D: highestClassificationCountsFor("Revolver").get("D"),
    C: highestClassificationCountsFor("Revolver").get("C"),
    B: highestClassificationCountsFor("Revolver").get("B"),
    A: highestClassificationCountsFor("Revolver").get("A"),
    M: highestClassificationCountsFor("Revolver").get("M"),
    GM: highestClassificationCountsFor("Revolver").get("GM"),
  },
  "Single Stack": {
    // 7
    U: highestClassificationCountsFor("Single Stack").get("U"),
    D: highestClassificationCountsFor("Single Stack").get("D"),
    C: highestClassificationCountsFor("Single Stack").get("C"),
    B: highestClassificationCountsFor("Single Stack").get("B"),
    A: highestClassificationCountsFor("Single Stack").get("A"),
    M: highestClassificationCountsFor("Single Stack").get("M"),
    GM: highestClassificationCountsFor("Single Stack").get("GM"),
  },
  "Carry Optics": {
    // 35
    U: highestClassificationCountsFor("Carry Optics").get("U"),
    D: highestClassificationCountsFor("Carry Optics").get("D"),
    C: highestClassificationCountsFor("Carry Optics").get("C"),
    B: highestClassificationCountsFor("Carry Optics").get("B"),
    A: highestClassificationCountsFor("Carry Optics").get("A"),
    M: highestClassificationCountsFor("Carry Optics").get("M"),
    GM: highestClassificationCountsFor("Carry Optics").get("GM"),
  },
  PCC: {
    // 38
    U: highestClassificationCountsFor("PCC").get("U"),
    D: highestClassificationCountsFor("PCC").get("D"),
    C: highestClassificationCountsFor("PCC").get("C"),
    B: highestClassificationCountsFor("PCC").get("B"),
    A: highestClassificationCountsFor("PCC").get("A"),
    M: highestClassificationCountsFor("PCC").get("M"),
    GM: highestClassificationCountsFor("PCC").get("GM"),
  },
  "Limited Optics": {
    // 41
    U: highestClassificationCountsFor("Limited Optics").get("U"),
    D: highestClassificationCountsFor("Limited Optics").get("D"),
    C: highestClassificationCountsFor("Limited Optics").get("C"),
    B: highestClassificationCountsFor("Limited Optics").get("B"),
    A: highestClassificationCountsFor("Limited Optics").get("A"),
    M: highestClassificationCountsFor("Limited Optics").get("M"),
    GM: highestClassificationCountsFor("Limited Optics").get("GM"),
  },
  Approx: {
    U: 0,
    D: 15,
    C: 40,
    B: 25,
    A: 12,
    M: 6,
    GM: 2,
  },
};

export default () => staticInefficientlyCalculatedDataButIDGAF;
