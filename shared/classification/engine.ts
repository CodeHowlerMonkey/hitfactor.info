import { v4 as randomUUID } from "uuid";

import { classificationDifficulty } from "@shared/constants/difficulty";
import { ageForDate } from "@shared/utils/date";
import orderedUniqBy from "@shared/utils/orderedUniqBy";

import { classForPercent } from "./brackets";
import {
  addToCurWindow,
  ClassificationState,
  ClassifierScore,
  getDivisionState,
} from "./state";

import { dateSort, numSort } from "../utils/sort";

const windowSizeForScore = (
  windowSize: number,
  minWindowSize: number = 4,
  bestWindowSize: number = 6,
) => {
  if (windowSize < minWindowSize) {
    return 0;
  } else if (windowSize === minWindowSize) {
    return minWindowSize;
  }

  return bestWindowSize;
};

export const percentAndAgesForDivWindow = (
  div: string,
  state: ClassificationState,
  now = new Date(),
  minWindowSize: number = 4,
  bestWindowSize: number = 6,
  percentCap: number = 100,
) => {
  // remove "older" different days duplicates
  const dFlagsApplied = orderedUniqBy(
    state[div].window.toSorted((a, b) => dateSort(a, b, "sd", -1)),
    "classifier",
  ).toSorted((a, b) => dateSort(a, b, "sd", 1));

  // remove worst scores (aka select best N number of scores (N being bestWindowSize))
  const fFlagsApplied = dFlagsApplied
    .toSorted((a, b) => numSort(a, b, "percent", -1))
    .slice(0, windowSizeForScore(dFlagsApplied.length, minWindowSize, bestWindowSize));

  const percent =
    fFlagsApplied.reduce((acc, cur) => acc + Math.min(percentCap, cur.percent), 0) /
      fFlagsApplied.length || 0;

  const age =
    fFlagsApplied.reduce(
      (acc, curValue) => acc + ageForDate(now, curValue.sd || now),
      0,
    ) / fFlagsApplied.length || 0;

  const effectiveWindow = fFlagsApplied.toSorted((a, b) => dateSort(a, b, "sd", -1));
  const lastScore = effectiveWindow[0];
  const firstScore = effectiveWindow[effectiveWindow.length - 1];
  const age1 = ageForDate(now, lastScore?.sd || now);
  const ageMax = ageForDate(now, firstScore?.sd || now);
  return {
    percent,
    age,
    age1,
    ageMax,
    age1Date: lastScore?.sd ? new Date(lastScore?.sd) : undefined,
    ageMaxDate: firstScore?.sd ? new Date(firstScore?.sd) : undefined,
    effectiveWindow: fFlagsApplied,
  };
};

export const dedupeGrandbagging = (scores: ClassifierScore[]) =>
  Object.values(
    scores.reduce(
      (acc, cur) => {
        cur.classifier = cur.classifier || randomUUID();
        const date = new Date(cur.sd).toLocaleDateString();
        const key = [date, cur.classifier, cur.division].join(":");
        acc[key] = acc[key] || [];
        acc[key].push(cur);
        return acc;
      },
      {} as Record<string, ClassifierScore[]>,
    ),
  ).map(dayScores => {
    const scoresCount = dayScores.length;
    if (scoresCount === 1) {
      return dayScores[0];
    }

    return {
      ...dayScores[0],
      percent: dayScores.reduce((acc, c) => acc + c.percent, 0) / scoresCount,
    };
  });

export const calculateUSPSAClassification = (
  classifiers: ClassifierScore[],
  now: Date = new Date(),
  minWindowSize: number = classificationDifficulty.window.min, // used for initial, less than that - no classification
  bestWindowSize: number = classificationDifficulty.window.best, // used for non-initial classifications, ideal window size when there are no dupes
  recentWindowSize: number = classificationDifficulty.window.recent, // number of most recent scores to consider
  percentCap: number = classificationDifficulty.percentCap,
): ClassificationState => {
  const state = {} as ClassificationState;
  if (!classifiers?.length) {
    return state;
  }

  const classifiersReadyToScore = dedupeGrandbagging(classifiers)
    .toSorted((a, b) => {
      const asDate = dateSort(a, b, "sd", 1);
      if (!asDate) {
        return numSort(a, b, "percent", 1);
      }
      return asDate;
    })
    .map(c => ({
      ...c,
      // Major Matches should always be eligible for reclassification
      classifier: c.source === "Major Match" ? randomUUID() : c.classifier,
    }))
    .filter(c => c.percent >= 0);

  const scoringFunction = (c: ClassifierScore) => {
    if (!c?.division) {
      return;
    }

    const { division } = c;
    const curDivisionState = (state[c.division] = getDivisionState(state, c.division));
    const curWindow = curDivisionState.window;
    addToCurWindow(c, curWindow, recentWindowSize);

    // age1 can be set even before we have enough classifiers
    if (curWindow.length >= 1) {
      const lastScore = curWindow.toSorted((a, b) => dateSort(a, b, "sd", -1))[0];
      const age1 = ageForDate(now, lastScore?.sd || now);
      state[division].age1 = age1;
    }

    // Calculate if have enough classifiers
    if (curWindow.length >= minWindowSize) {
      const oldHighPercent = state[division].highPercent;
      const {
        percent: newPercent,
        age,
        age1,
        age1Date,
        ageMax,
        ageMaxDate,
        effectiveWindow,
      } = percentAndAgesForDivWindow(
        division,
        state,
        now,
        minWindowSize,
        bestWindowSize,
        percentCap,
      );

      const newClass = classForPercent(newPercent);
      if (newPercent > oldHighPercent) {
        state[division].highPercent = newPercent;
        state[division].highClass = newClass;
      }
      state[division].percent = newPercent;
      state[division].class = newClass;
      state[division].age = age;
      state[division].age1 = age1;
      state[division].ageMax = ageMax;
      state[division].age1Date = age1Date;
      state[division].ageMaxDate = ageMaxDate;
      state[division].effectiveWindow = effectiveWindow;
      state[c.division].percentWithDates.push({ p: newPercent, sd: new Date(c.sd) });
    }
  };

  classifiersReadyToScore.forEach(scoringFunction);

  /*
  Object.keys(state).forEach(div => {
    delete state[div].window;
  });*/

  return state;
};
