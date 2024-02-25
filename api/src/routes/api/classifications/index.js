import { extendedClassificationsInfo } from "../../../dataUtil/classifications.js";

const classificationRank = (classification) =>
  ["X", "U", "D", "C", "B", "A", "M", "GM"].indexOf(classification);
/* const hasClassification = (classification) =>
  ["D", "C", "B", "A", "M", "GM"].indexOf(classification) !== -1; */

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

const highestClassification = (classificationsObj) =>
  Object.values(classificationsObj).reduce((prev, curClass) => {
    if (classificationRank(prev) >= classificationRank(curClass)) {
      return prev;
    } else {
      return curClass;
    }
  }, undefined);

const selectDivision = (division, classificationsObj) =>
  division
    ? {
        [division]: classificationsObj[division],
      }
    : classificationsObj;

export const highestClassificationCountsFor = (division) => {
  const highestClassifications = extendedClassificationsInfo
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
    U: highestClassificationCountsFor("opn").get("U"),
    D: highestClassificationCountsFor("opn").get("D"),
    C: highestClassificationCountsFor("opn").get("C"),
    B: highestClassificationCountsFor("opn").get("B"),
    A: highestClassificationCountsFor("opn").get("A"),
    M: highestClassificationCountsFor("opn").get("M"),
    GM: highestClassificationCountsFor("opn").get("GM"),
  },
  Limited: {
    // 3
    U: highestClassificationCountsFor("ltd").get("U"),
    D: highestClassificationCountsFor("ltd").get("D"),
    C: highestClassificationCountsFor("ltd").get("C"),
    B: highestClassificationCountsFor("ltd").get("B"),
    A: highestClassificationCountsFor("ltd").get("A"),
    M: highestClassificationCountsFor("ltd").get("M"),
    GM: highestClassificationCountsFor("ltd").get("GM"),
  },
  "Limited 10": {
    // 4
    U: highestClassificationCountsFor("l10").get("U"),
    D: highestClassificationCountsFor("l10").get("D"),
    C: highestClassificationCountsFor("l10").get("C"),
    B: highestClassificationCountsFor("l10").get("B"),
    A: highestClassificationCountsFor("l10").get("A"),
    M: highestClassificationCountsFor("l10").get("M"),
    GM: highestClassificationCountsFor("l10").get("GM"),
  },
  Production: {
    // 5
    U: highestClassificationCountsFor("prod").get("U"),
    D: highestClassificationCountsFor("prod").get("D"),
    C: highestClassificationCountsFor("prod").get("C"),
    B: highestClassificationCountsFor("prod").get("B"),
    A: highestClassificationCountsFor("prod").get("A"),
    M: highestClassificationCountsFor("prod").get("M"),
    GM: highestClassificationCountsFor("prod").get("GM"),
  },
  Revolver: {
    // 6
    U: highestClassificationCountsFor("rev").get("U"),
    D: highestClassificationCountsFor("rev").get("D"),
    C: highestClassificationCountsFor("rev").get("C"),
    B: highestClassificationCountsFor("rev").get("B"),
    A: highestClassificationCountsFor("rev").get("A"),
    M: highestClassificationCountsFor("rev").get("M"),
    GM: highestClassificationCountsFor("rev").get("GM"),
  },
  "Single Stack": {
    // 7
    U: highestClassificationCountsFor("ss").get("U"),
    D: highestClassificationCountsFor("ss").get("D"),
    C: highestClassificationCountsFor("ss").get("C"),
    B: highestClassificationCountsFor("ss").get("B"),
    A: highestClassificationCountsFor("ss").get("A"),
    M: highestClassificationCountsFor("ss").get("M"),
    GM: highestClassificationCountsFor("ss").get("GM"),
  },
  "Carry Optics": {
    // 35
    U: highestClassificationCountsFor("co").get("U"),
    D: highestClassificationCountsFor("co").get("D"),
    C: highestClassificationCountsFor("co").get("C"),
    B: highestClassificationCountsFor("co").get("B"),
    A: highestClassificationCountsFor("co").get("A"),
    M: highestClassificationCountsFor("co").get("M"),
    GM: highestClassificationCountsFor("co").get("GM"),
  },
  PCC: {
    // 38
    U: highestClassificationCountsFor("pcc").get("U"),
    D: highestClassificationCountsFor("pcc").get("D"),
    C: highestClassificationCountsFor("pcc").get("C"),
    B: highestClassificationCountsFor("pcc").get("B"),
    A: highestClassificationCountsFor("pcc").get("A"),
    M: highestClassificationCountsFor("pcc").get("M"),
    GM: highestClassificationCountsFor("pcc").get("GM"),
  },
  "Limited Optics": {
    // 41
    U: highestClassificationCountsFor("lo").get("U"),
    D: highestClassificationCountsFor("lo").get("D"),
    C: highestClassificationCountsFor("lo").get("C"),
    B: highestClassificationCountsFor("lo").get("B"),
    A: highestClassificationCountsFor("lo").get("A"),
    M: highestClassificationCountsFor("lo").get("M"),
    GM: highestClassificationCountsFor("lo").get("GM"),
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

const classificationsRoutes = async (fastify, opts) => {
  fastify.get("/", (req, res) => staticInefficientlyCalculatedDataButIDGAF);
};

export default classificationsRoutes;
