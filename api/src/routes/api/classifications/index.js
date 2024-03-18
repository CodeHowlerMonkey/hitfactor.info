import {
  getRecHHFMap,
  getShooterToCurPercentClassifications,
  getShooterToRuns,
} from "../../../dataUtil/classifiers.js";
import {
  highestClassification,
  classForPercent,
} from "../../../../../shared/utils/classification.js";
import { getExtendedClassificationsInfo } from "../../../dataUtil/classifications.js";
import { mapDivisions } from "../../../dataUtil/divisions.js";
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

const getHighestClassificationCountsFor = (division, mode) => {
  const highestClassifications = getExtendedClassificationsInfo()
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

const getDivisionClassBucket = (div, mode) => ({
  U: getHighestClassificationCountsFor(div, mode).get("U"),
  D: getHighestClassificationCountsFor(div, mode).get("D"),
  C: getHighestClassificationCountsFor(div, mode).get("C"),
  B: getHighestClassificationCountsFor(div, mode).get("B"),
  A: getHighestClassificationCountsFor(div, mode).get("A"),
  M: getHighestClassificationCountsFor(div, mode).get("M"),
  GM: getHighestClassificationCountsFor(div, mode).get("GM"),
});

const bucketBy = (byWhat) => ({
  all: getDivisionClassBucket(undefined, byWhat),
  ...mapDivisions((div) => getDivisionClassBucket(div, byWhat)),
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

let _stats = null;
const getMemoizedClassificationStats = () => {
  if (_stats) {
    return _stats;
  }

  _stats = {
    byClass: bucketBy("class"),
    byPercent: bucketBy("percent"),
    byCurHHFPercent: bucketBy("curHHFPercent"),
    byRecHHFPercent: bucketBy("recHHFPercent"),
  };
  return _stats;
};

const classificationsRoutes = async (fastify, opts) => {
  fastify.get("/", (req, res) => {
    return getMemoizedClassificationStats();
  });
  fastify.addHook("onListen", () => {
    if (process.env.QUICK_DEV) {
      console.log("USING FAST HYDRATION (you will only have partial data)");
    }
    console.log("hydrating classifiers", "color: green");
    mapDivisions((div) => classifiersForDivision(div));
    getRecHHFMap();
    console.log("done hydrating classifiers ");

    console.log("hydrating shooters");
    getShooterToRuns();
    getShootersTable();
    getShootersTableByMemberNumber();
    getShooterToCurPercentClassifications();
    console.log("done hydrating shooters");

    console.log("hydrating classification stats");
    getMemoizedClassificationStats();
    console.log("done hydrating classification stats");

    // Keep this at the end of all hydration calls
    console.log("HYDRATION DONE, API should be responsive now");
  });
};

export default classificationsRoutes;
