import { getExtendedClassificationsInfo } from "../../../dataUtil/classifications.js";
import {
  mapDivisions,
  mapDivisionsAsync,
} from "../../../dataUtil/divisions.js";
import { badLazy } from "../../../utils.js";

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

const calculateCurrentClassifications = (memberCurPercentObj) =>
  mapDivisions((div) => {
    const curPercent = memberCurPercentObj[div];
    if (curPercent <= 0) {
      return "U";
    } else if (curPercent < 40) {
      return "D";
    } else if (curPercent < 60) {
      return "C";
    } else if (curPercent < 75) {
      return "B";
    } else if (curPercent < 85) {
      return "A";
    } else if (curPercent < 95) {
      return "M";
    } else if (curPercent >= 95) {
      return "GM";
    }

    return "U";
  });

const selectClassificationsForDivision = (
  division,
  extMemberInfoObject,
  mode
) => {
  const classificationsObj =
    mode !== "percent"
      ? extMemberInfoObject.classifications
      : calculateCurrentClassifications(extMemberInfoObject.current);
  return division
    ? {
        [division]: classificationsObj[division],
      }
    : classificationsObj;
};

const getHighestClassificationCountsFor = async (division, mode) => {
  const highestClassifications = (await getExtendedClassificationsInfo())
    .map((cur) =>
      highestClassification(
        selectClassificationsForDivision(division, cur, mode)
      )
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

const getDivisionClassBucket = async (div, mode) => ({
  U: (await getHighestClassificationCountsFor(div, mode)).get("U"),
  D: (await getHighestClassificationCountsFor(div, mode)).get("D"),
  C: (await getHighestClassificationCountsFor(div, mode)).get("C"),
  B: (await getHighestClassificationCountsFor(div, mode)).get("B"),
  A: (await getHighestClassificationCountsFor(div, mode)).get("A"),
  M: (await getHighestClassificationCountsFor(div, mode)).get("M"),
  GM: (await getHighestClassificationCountsFor(div, mode)).get("GM"),
});

const getMemoizedClassificationStats = badLazy(async () => ({
  byClass: {
    all: await getDivisionClassBucket(undefined, "class"),
    ...(await mapDivisionsAsync(
      async (div) => await getDivisionClassBucket(div, "class")
    )),
    Approx: {
      U: 0,
      D: 15,
      C: 40,
      B: 25,
      A: 12,
      M: 6,
      GM: 2,
    },
  },
  byPercent: {
    all: await getDivisionClassBucket(undefined, "percent"),
    ...(await mapDivisionsAsync(
      async (div) => await getDivisionClassBucket(div, "percent")
    )),
    Approx: {
      U: 0,
      D: 19,
      C: 42,
      B: 25,
      A: 8,
      M: 5,
      GM: 1,
    },
  },
}));

const classificationsRoutes = async (fastify, opts) => {
  fastify.get("/", async (req, res) => {
    return await getMemoizedClassificationStats();
  });
  fastify.addHook("onListen", async () => {
    console.log("hydrating classification stats");
    await getMemoizedClassificationStats();
    console.log("done hydrating classification stats");
  });
};

export default classificationsRoutes;
