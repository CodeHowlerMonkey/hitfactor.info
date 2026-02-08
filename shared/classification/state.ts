import { ClassLetter } from "./brackets";

export interface PercentWithDate {
  p: number;
  sd: Date;
}

export interface DivisionClassification {
  window: ClassifierScore[];
  percentWithDates: PercentWithDate[];

  class: ClassLetter;
  highClass: ClassLetter;

  percent: number;
  highPercent: number;

  age: number;
  age1: number;
  ageMax: number;
  effectiveWindow: ClassifierScore[];
  age1Date?: Date;
  ageMaxDate?: Date;
}
export type DivisionClassificationWithoutWindow = Omit<DivisionClassification, "window">;

export type ClassificationState = Record<string, DivisionClassification>;
export type WindowlessClassificationState = Record<
  string,
  DivisionClassificationWithoutWindow
>;

export interface ClassifierScore {
  source: string;
  classifier: string;
  division: string;
  sd: Date | string;

  percent: number;
}

export const initialClassificationStateForDivision = (): DivisionClassification => ({
  class: "U",
  highClass: "U",
  percent: 0,
  highPercent: 0,
  window: [],
  percentWithDates: [],
  age: 0,
  age1: 0,
  ageMax: 0,
  effectiveWindow: [],
  age1Date: undefined,
  ageMaxDate: undefined,
});

export const getDivisionState = (state: ClassificationState, division: string) =>
  state[division] || initialClassificationStateForDivision();

export const stateWithoutWindow = (
  state: ClassificationState,
): WindowlessClassificationState => {
  const newState = {} as WindowlessClassificationState;
  Object.keys(state).forEach(div => {
    const { window, ...divState } = state[div];
    newState[div] = divState;
  });
  return newState;
};

export const numberOfDuplicates = (window: ClassifierScore[]): number => {
  const table: Record<string, number> = {};
  window.forEach(c => {
    const curCount = table[c.classifier] || 0;
    table[c.classifier] = curCount + 1;
  });
  return Object.values(table)
    .map((c: number) => c - 1)
    .reduce((acc, cur) => acc + cur, 0);
};

// adds in place, growing window if needed for duplicates
export const addToCurWindow = (
  c: ClassifierScore,
  curWindow: ClassifierScore[],
  targetWindowSize = 8,
) => {
  // push, truncate the tail, then re-add tail partially for each duplicate
  curWindow.push(c);
  curWindow.reverse();
  const extraWindowLength = numberOfDuplicates(curWindow);
  const removed = curWindow.splice(targetWindowSize);
  curWindow.reverse();
  const extraFromTail = removed.slice(0, extraWindowLength).reverse();
  curWindow.unshift(...extraFromTail);
};
