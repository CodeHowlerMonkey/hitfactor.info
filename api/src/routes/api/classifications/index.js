import {
  highestClassification,
  classForPercent,
} from "../../../../../shared/utils/classification.js";
import { getExtendedClassificationsInfo } from "../../../dataUtil/classifications.js";
import {
  mapDivisions,
  mapDivisionsAsync,
} from "../../../dataUtil/divisions.js";
import { badLazy } from "../../../utils.js";

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

const calculateCurrentClassifications = (memberCurPercentObj) =>
  mapDivisions((div) => {
    const curPercent = memberCurPercentObj[div];
    return classForPercent(curPercent);
  });

const selectClassificationsForDivision = (
  division,
  extMemberInfoObject,
  mode
) => {
  let classificationsObj = extMemberInfoObject.classifications;
  if (mode === "percent") {
    classificationsObj = calculateCurrentClassifications(
      extMemberInfoObject.current
    );
  } else if (mode === "curHHFPercent") {
    classificationsObj = calculateCurrentClassifications(
      mapDivisions(
        (div) =>
          extMemberInfoObject.reclassificationsByCurPercent?.[div]?.percent ?? 0
      )
    );
  }

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
  byCurHHFPercent: {
    all: await getDivisionClassBucket(undefined, "curHHFPercent"),
    ...(await mapDivisionsAsync(
      async (div) => await getDivisionClassBucket(div, "curHHFPercent")
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
