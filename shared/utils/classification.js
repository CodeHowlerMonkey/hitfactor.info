import { v4 as randomUUID } from "uuid";
import { mapDivisions } from "../../api/src/dataUtil/divisions.js";
import uniqBy from "lodash.uniqby";
import { dateSort, numSort } from "./sort.js";

export const classificationRank = (classification) =>
  ["X", "U", "D", "C", "B", "A", "M", "GM"].indexOf(classification);
/* const hasClassification = (classification) =>
  ["D", "C", "B", "A", "M", "GM"].indexOf(classification) !== -1; */

export const highestClassification = (classificationsObj) =>
  Object.values(classificationsObj).reduce((prev, curClass) => {
    if (classificationRank(prev) >= classificationRank(curClass)) {
      return prev;
    } else {
      return curClass;
    }
  }, undefined);

export const classForPercent = (curPercent) => {
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
};
export const rankForClass = (classification) =>
  ({
    GM: 95,
    M: 85,
    A: 75,
    B: 60,
    C: 40,
    D: 10,
    U: 0,
    X: -1,
  }[classification] || 0);

// B-class check, NOT used for initial classification
export const lowestAllowedPercentForClass = (classification) =>
  ({
    GM: 90,
    M: 80,
    A: 70,
    B: 55,
    C: 35,
  }[classification] || 0);

// C-class check, NOT used for initial classification
export const lowestAllowedPercentForOtherDivisionClass = (
  highestClassification
) =>
  ({
    GM: 85,
    M: 75,
    A: 60,
    B: 40,
  }[highestClassification] || 0);

export const canBeInserted = (c, state, percentField = "percent") => {
  try {
    const { division, classifier } = c;
    if (!division) {
      return false;
    }
    const { window } = state[division];
    const percent = c[percentField];

    // zeros never count - instant B flag
    if (!c[percentField]) {
      return false;
    }

    // Looks like A-flag is gone
    const cFlagThreshold = lowestAllowedPercentForOtherDivisionClass(
      highestClassification(getDivToClass(state))
    );
    const isBFlag =
      percent <= lowestAllowedPercentForClass(getDivToClass(state)[division]);
    const isCFlag = percent <= cFlagThreshold;

    // First non-dupe 4 always count
    const dFlagsApplied = uniqBy(window, (c) => c.classifier);
    if (dFlagsApplied.length <= 4) {
      return true;
    }

    // recPercent == special recommended mode, no B/C flags, best 6 out of last 10
    if ((isCFlag || isBFlag) && percentField !== "recPercent") {
      return false;
    }

    // D, F, E
    return true;
  } catch (all) {
    console.log("canBeInserted crash");
    console.log(c.division);
  }
  return false;
};

// if true -- window doesn't have to shrink when inserting
export const hasDuplicateInWindow = (c, window) =>
  window.map((cur) => cur.classifier).includes(c.classifier);

export const hasDuplicate = (c, state) =>
  hasDuplicateInWindow(c, state[c.division].window);

export const numberOfDuplicates = (window) => {
  const table = {};
  window.forEach((c) => {
    const curCount = table[c.classifier] || 0;
    table[c.classifier] = curCount + 1;
  });
  return Object.values(table)
    .map((c) => c - 1)
    .reduce((acc, cur) => acc + cur, 0);
};

const windowSizeForScore = (windowSize) => {
  if (windowSize < 4) {
    return 0;
  } else if (windowSize === 4) {
    return 4;
  }

  return 6;
};

export const percentForDivWindow = (div, state, percentField = "percent") => {
  const window = state[div].window.toSorted((a, b) =>
    numSort(a, b, percentField, -1)
  );

  //de-dupe needs to be done in reverse, because percent are sorted asc
  const dFlagsApplied = uniqBy(window, (c) => c.classifier);

  // remove lowest 2
  const newLength = windowSizeForScore(dFlagsApplied.length);
  const fFlagsApplied = dFlagsApplied.slice(0, newLength);
  return fFlagsApplied.reduce(
    (acc, curValue, curIndex, allInWindow) =>
      acc + Math.min(100, curValue[percentField]) / allInWindow.length,
    0
  );
};

export const newClassificationCalculationState = () =>
  mapDivisions((div) => ({
    percent: 0,
    highPercent: 0,
    window: [],
    percentWithDates: [],
  }));

// adds in place, growing window if needed for duplicates
export const addToCurWindow = (c, curWindow, targetWindowSize = 8) => {
  // push, truncate the tail, then re-add tail partially for each duplicate
  curWindow.push(c);
  curWindow.reverse();
  const removed = curWindow.splice(targetWindowSize);
  curWindow.reverse();
  const extraWindowLength = numberOfDuplicates([...removed, ...curWindow]);
  const extraFromTail = removed.slice(0, extraWindowLength).reverse();
  curWindow.unshift(...extraFromTail);
};

// TODO: minimal class as highest - 1
export const calculateUSPSAClassification = (
  classifiers,
  percentField = "percent"
) => {
  const state = newClassificationCalculationState();
  if (!classifiers.length) {
    return state;
  }

  const classifiersReadyToScore = classifiers
    .toSorted((a, b) => {
      const asDate = dateSort(a, b, "sd", 1);
      if (!asDate) {
        return numSort(a, b, percentField, 1);
      }
      return asDate;
    })
    .map((c) => ({
      ...c,
      // Major Matches should always be eligible for reclassification
      classifier: c.source === "Major Match" ? randomUUID() : c.classifier,
      curPercent: c.source === "Major Match" ? c.percent : c.curPercent,
    }))
    .filter((c) => c[percentField] >= 0);

  const scoringFunction = (c) => {
    if (!canBeInserted(c, state, percentField)) {
      return;
    }
    const { division } = c;
    const curWindow = state[c.division].window;

    addToCurWindow(c, curWindow, percentField === "recPercent" ? 10 : 8);

    // Calculate if have enough classifiers
    if (curWindow.length >= 4) {
      const oldHighPercent = state[division].highPercent;
      const newPercent = percentForDivWindow(division, state, percentField);
      if (newPercent > oldHighPercent) {
        state[division].highPercent = newPercent;
      }
      state[division].percent = newPercent;
      state[c.division].percentWithDates.push({ p: newPercent, sd: c.sd });
    }
  };

  classifiersReadyToScore.forEach(scoringFunction);

  return mapDivisions((div) => {
    state[div].class = classForPercent(state[div].percent);
    // delete state[div].window;
    return state[div];
  });
};

export const getDivToClass = (state) =>
  mapDivisions((div) => classForPercent(state[div].highPercent));
