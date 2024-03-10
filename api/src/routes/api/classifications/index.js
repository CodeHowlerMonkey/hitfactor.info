import {
  getShooterToCurPercentClassifications,
  getShooterToRuns,
  precomputeRecHHFMap,
} from "../../../dataUtil/classifiers.js";
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
import { classifiersForDivision } from "../../../classifiers.api.js";
import {
  getShootersTable,
  getShootersTableByMemberNumber,
} from "../../../dataUtil/shooters.js";

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
  } else if (mode === "recHHFPercent") {
    classificationsObj = calculateCurrentClassifications(
      mapDivisions(
        (div) =>
          extMemberInfoObject.reclassificationsByRecPercent?.[div]?.percent ?? 0
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

const bucketBy = async (byWhat) => ({
  all: await getDivisionClassBucket(undefined, byWhat),
  ...(await mapDivisionsAsync(
    async (div) => await getDivisionClassBucket(div, byWhat)
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
});

const getMemoizedClassificationStats = badLazy(async () => ({
  byClass: await bucketBy("class"),
  byPercent: await bucketBy("percent"),
  byCurHHFPercent: await bucketBy("curHHFPercent"),
  byRecHHFPercent: await bucketBy("recHHFPercent"),
}));

const classificationsRoutes = async (fastify, opts) => {
  fastify.get("/", async (req, res) => {
    return await getMemoizedClassificationStats();
  });
  fastify.addHook("onListen", async () => {
    console.log("hydrating classifiers");
    await mapDivisionsAsync(async (div) => await classifiersForDivision(div));
    await precomputeRecHHFMap();
    console.log("done hydrating classifiers ");

    console.log("hydrating shooters");
    await getShooterToRuns();
    await getShootersTable();
    await getShootersTableByMemberNumber();
    await getShooterToCurPercentClassifications();
    console.log("done hydrating shooters");

    console.log("hydrating classification stats");
    await getMemoizedClassificationStats();
    console.log("done hydrating classification stats");
  });
};

export default classificationsRoutes;
