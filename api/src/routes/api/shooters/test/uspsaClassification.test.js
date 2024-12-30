import assert from "assert";
import test from "node:test";

import {
  addToCurWindow,
  calculateUSPSAClassification,
  canBeInserted,
  classForPercent,
  getDivToClass,
  hasDuplicate,
  highestClassification,
  lowestAllowedPercentForClass,
  lowestAllowedPercentForOtherDivisionClass,
  newClassificationCalculationState,
  numberOfDuplicates,
  percentAndAgesForDivWindow,
} from "../../../../../../shared/utils/classification";
import { dateSort } from "../../../../../../shared/utils/sort";

import testData, {
  csClassifiers,
  csOpenClassifiers,
  noCurPercentButExpected,
} from "./testData";

test("lets make sure this works first", () => {
  assert.strictEqual(1, 1);
});

test("cheap data integrity check", () => {
  // if this is broken -- you updated testData, but not the tests
  assert.strictEqual(252, testData.length);
});

test("newClassificationCalculationState", () => {
  assert.deepEqual(newClassificationCalculationState(), {
    opn: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    ltd: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    l10: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    prod: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    rev: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    ss: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    co: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    lo: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    pcc: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    comp: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    opt: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    irn: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
    car: { percent: 0, highPercent: 0, window: [], percentWithDates: [] },
  });
});

test("classForPercent", () => {
  assert.strictEqual(classForPercent(0), "U");
  assert.strictEqual(classForPercent(-0), "U");
  assert.strictEqual(classForPercent(-1), "U");

  assert.strictEqual(classForPercent(10), "D");
  assert.strictEqual(classForPercent(10.11), "D");
  assert.strictEqual(classForPercent(39.999999), "D");

  assert.strictEqual(classForPercent(40), "C");
  assert.strictEqual(classForPercent(45), "C");
  assert.strictEqual(classForPercent(55.9999), "C");
  assert.strictEqual(classForPercent(59.9999), "C");

  assert.strictEqual(classForPercent(60.0), "B");
  assert.strictEqual(classForPercent(60.00001), "B");
  assert.strictEqual(classForPercent(60.00001), "B");
  assert.strictEqual(classForPercent(64.00001), "B");
  assert.strictEqual(classForPercent(72.00001), "B");
  assert.strictEqual(classForPercent(74.00001), "B");
  assert.strictEqual(classForPercent(74.99991), "B");

  assert.strictEqual(classForPercent(80.00001), "A");
  assert.strictEqual(classForPercent(80.00001), "A");
  assert.strictEqual(classForPercent(81.00001), "A");
  assert.strictEqual(classForPercent(82.00001), "A");
  assert.strictEqual(classForPercent(83.00001), "A");
  assert.strictEqual(classForPercent(84.00001), "A");
  assert.strictEqual(classForPercent(84.99999), "A");

  assert.strictEqual(classForPercent(85), "M");
  assert.strictEqual(classForPercent(85.00001), "M");
  assert.strictEqual(classForPercent(87.00001), "M");
  assert.strictEqual(classForPercent(94.00001), "M");
  assert.strictEqual(classForPercent(94.99001), "M");
  assert.strictEqual(classForPercent(94.99999), "M");
  assert.strictEqual(classForPercent(94.00001), "M");

  assert.strictEqual(classForPercent(95), "GM");
  assert.strictEqual(classForPercent(95.00001), "GM");
  assert.strictEqual(classForPercent(97.00001), "GM");
  assert.strictEqual(classForPercent(103.00001), "GM");
  assert.strictEqual(classForPercent(101), "GM");
  assert.strictEqual(classForPercent(102), "GM");
});

test("highestClassification", () => {
  assert.strictEqual(highestClassification({ foo: "U", bar: "A" }), "A");
  assert.strictEqual(highestClassification({ foo: "A", bar: "M" }), "M");
  assert.strictEqual(highestClassification({ foo: "A", bar: "M", baz: "C" }), "M");
  assert.strictEqual(highestClassification({ foo: "A", bar: "M", baz: "GM" }), "GM");

  assert.strictEqual(
    highestClassification({
      opn: "M",
      ltd: "M",
      l10: "M",
      prod: "M",
      rev: "U",
      ss: "X",
      co: "GM",
      lo: "GM",
      PCC: "M",
    }),
    "GM",
  );

  assert.strictEqual(
    highestClassification({
      opn: "M",
      ltd: "M",
      l10: "M",
      prod: "M",
      rev: "U",
      ss: "X",
      co: "A",
      lo: "A",
      PCC: "M",
    }),
    "M",
  );

  assert.strictEqual(
    highestClassification({
      opn: "B",
      ltd: "B",
      l10: "B",
      prod: "C",
      rev: "U",
      ss: "X",
      co: "A",
      lo: "B",
      PCC: "A",
    }),
    "A",
  );

  assert.strictEqual(
    highestClassification({
      opn: "B",
      ltd: "B",
      l10: "B",
      prod: "C",
      rev: "U",
      ss: "X",
      co: "A",
      lo: "B",
      PCC: "A",
    }),
    "A",
  );
});

test("lowestAllowedPercentForClass", () => {
  assert.strictEqual(lowestAllowedPercentForClass("GM"), 90);
  assert.strictEqual(lowestAllowedPercentForClass("M"), 80);
  assert.strictEqual(lowestAllowedPercentForClass("A"), 70);
  assert.strictEqual(lowestAllowedPercentForClass("B"), 55);
  assert.strictEqual(lowestAllowedPercentForClass("C"), 35);

  assert.strictEqual(lowestAllowedPercentForClass("U"), 0);
  assert.strictEqual(lowestAllowedPercentForClass("X"), 0);
  assert.strictEqual(lowestAllowedPercentForClass(undefined), 0);
  assert.strictEqual(lowestAllowedPercentForClass(null), 0);
  assert.strictEqual(lowestAllowedPercentForClass(0), 0);
  assert.strictEqual(lowestAllowedPercentForClass(1), 0);
});

test("lowestAllowedPercentForOtherDivisionClass", () => {
  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass("GM"), 85);
  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass("M"), 75);
  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass("A"), 60);
  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass("B"), 40);

  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass("C"), 0);
  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass("U"), 0);
  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass("X"), 0);
  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass(undefined), 0);
  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass(null), 0);
  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass(0), 0);
  assert.strictEqual(lowestAllowedPercentForOtherDivisionClass(1), 0);
});

test("getDivToClass", () => {
  const state = {
    opn: { percent: 0, highPercent: 12, window: [], percentWithDates: [] },
    ltd: { percent: 0, highPercent: 42, window: [], percentWithDates: [] },
    l10: { percent: 0, highPercent: 52, window: [], percentWithDates: [] },
    prod: { percent: 0, highPercent: 62, window: [], percentWithDates: [] },
    rev: { percent: 0, highPercent: 72, window: [], percentWithDates: [] },
    ss: { percent: 0, highPercent: 82, window: [], percentWithDates: [] },
    co: { percent: 0, highPercent: 92, window: [], percentWithDates: [] },
    lo: { percent: 0, highPercent: 112, window: [], percentWithDates: [] },
    pcc: { percent: 0, highPercent: 100, window: [], percentWithDates: [] },
  };

  assert.deepEqual(getDivToClass(state), {
    opn: "D",
    ltd: "C",
    l10: "C",
    prod: "B",
    ss: "A",
    rev: "B",
    co: "M",
    lo: "GM",
    pcc: "GM",
    comp: "U",
    opt: "U",
    irn: "U",
    car: "U",
  });
});

const makeClassifier = ({
  classifier,
  percent,
  division,
  sd,
  curPercent,
  recPercent,
} = {}) => ({
  classifier: classifier ?? "99-11",
  sd: sd ?? "1/01/23",
  percent: percent ?? 74.999,
  division: division ?? "ss",
  curPercent: curPercent ?? 0,
  recPercent: recPercent ?? 0,
});

test("canBeInserted", () => {
  const state = newClassificationCalculationState();
  assert.strictEqual(canBeInserted(makeClassifier(), state), true);

  state.ss.window = [
    makeClassifier({ classifier: "13-01" }),
    makeClassifier({ classifier: "13-02" }),
    makeClassifier({ classifier: "13-03" }),
    makeClassifier({ classifier: "13-04" }),
    makeClassifier({ classifier: "13-05" }),
    makeClassifier({ classifier: "13-06" }),
  ];
  assert.strictEqual(canBeInserted(makeClassifier(), state), true);

  // check B flag logic
  state.ss.highPercent = 75.001;
  assert.strictEqual(canBeInserted(makeClassifier({ percent: 70 }), state), false);

  // check C flag logic
  assert.strictEqual(
    canBeInserted(
      makeClassifier({ percent: 70, recPercent: 70 }),
      state,
      "recPercent",
      "brutal",
    ),
    true,
  );
  assert.strictEqual(
    canBeInserted(
      makeClassifier({ percent: 70, recPercent: 70 }),
      state,
      "recPercent",
      "uspsa",
    ),
    false,
  );

  // check C flag logic without and with recPercent field + allow BC flags mode
  state.ss.highPercent = 75.001;
  assert.strictEqual(canBeInserted(makeClassifier({ percent: 70.01 }), state), true);
  assert.strictEqual(
    canBeInserted(
      makeClassifier({ percent: 70.01, recPercent: 70.01 }),
      state,
      "recPercent",
      "brutal",
    ),
    true,
  );
  assert.strictEqual(
    canBeInserted(
      makeClassifier({ percent: 70.01, recPercent: 70.01 }),
      state,
      "recPercent",
      "uspsa",
    ),
    true,
  );
  state.rev.highPercent = 86;
  assert.strictEqual(canBeInserted(makeClassifier({ percent: 70.01 }), state), false);
  assert.strictEqual(
    canBeInserted(
      makeClassifier({ percent: 70.01, recPercent: 70.01 }),
      state,
      "recPercent",
      "brutal",
    ),
    true,
  );
  assert.strictEqual(
    canBeInserted(
      makeClassifier({ percent: 70.01, recPercent: 70.01 }),
      state,
      "recPercent",
      "uspsa",
    ),
    false,
  );

  // check that B and C checks don't count if window is smaller than 4
  state.ss.window = [makeClassifier(), makeClassifier(), makeClassifier()];
  assert.strictEqual(canBeInserted(makeClassifier({ percent: 70.01 }), state), true);
  assert.strictEqual(canBeInserted(makeClassifier({ percent: 20.01 }), state), true);
});

test("canBeInserted + percentField", () => {
  const state = newClassificationCalculationState();
  assert.strictEqual(
    canBeInserted(makeClassifier({ curPercent: 12 }), state, "curPercent"),
    true,
  );

  state.ss.window = [
    makeClassifier({ curPercent: 12, classifier: "13-01" }),
    makeClassifier({ curPercent: 12, classifier: "13-02" }),
    makeClassifier({ curPercent: 12, classifier: "13-06" }),
    makeClassifier({ curPercent: 12, classifier: "13-07" }),
    makeClassifier({ curPercent: 12, classifier: "13-08" }),
    makeClassifier({ curPercent: 12, classifier: "13-09" }),
  ];
  assert.strictEqual(
    canBeInserted(makeClassifier({ curPercent: 12 }), state, "curPercent"),
    true,
  );

  // check B flag logic
  state.ss.highPercent = 75.001;
  assert.strictEqual(
    canBeInserted(makeClassifier({ curPercent: 70 }), state, "curPercent"),
    false,
  );
  assert.strictEqual(
    canBeInserted(makeClassifier({ curPercent: 76 }), state, "curPercent"),
    true,
  );

  // check C flag logic
  state.ss.highPercent = 75.001;
  assert.strictEqual(
    canBeInserted(makeClassifier({ curPercent: 70.01 }), state, "curPercent"),
    true,
  );
  state.rev.highPercent = 86;
  assert.strictEqual(
    canBeInserted(makeClassifier({ curPercent: 70.01 }), state, "curPercent"),
    false,
  );

  // check that B and C checks don't count if window is smaller than 4
  state.ss.window = [makeClassifier(), makeClassifier(), makeClassifier()];
  assert.strictEqual(
    canBeInserted(makeClassifier({ curPercent: 70.01 }), state, "curPercent"),
    true,
  );
  assert.strictEqual(
    canBeInserted(makeClassifier({ curPercent: 20.01 }), state, "curPercent"),
    true,
  );
});

test("hasDuplicate", () => {
  const state = newClassificationCalculationState();
  assert.strictEqual(hasDuplicate(makeClassifier(), state), false);

  state.ss.window = [makeClassifier()];
  assert.strictEqual(hasDuplicate(makeClassifier(), state), true);
  assert.strictEqual(hasDuplicate(makeClassifier({ classifier: "99-12" }), state), false);
  state.ss.window.push(makeClassifier({ classifier: "99-12" }));
  assert.strictEqual(hasDuplicate(makeClassifier({ classifier: "99-12" }), state), true);
});

test("percentAndAgesForDivWindow", () => {
  // default to zero
  const state = newClassificationCalculationState();
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    0,
  );

  // single classifier
  state.ss.window.push(makeClassifier({ percent: 50 }));
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    0,
  );

  // best of same single classifier duplicates
  state.ss.window = [];
  state.ss.window.push(makeClassifier({ percent: 75 }));
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    0,
  );
  state.ss.window.push(makeClassifier({ percent: 85 }));
  state.ss.window.push(makeClassifier({ percent: 95 }));
  state.ss.window.push(makeClassifier({ percent: 97 }));
  state.ss.window.push(makeClassifier({ percent: 97 }));
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    0,
  );

  // average of 4 unique
  state.ss.window.push(makeClassifier({ classifier: "01-01", percent: 75 }));
  state.ss.window.push(makeClassifier({ classifier: "01-02", percent: 65 }));
  state.ss.window.push(makeClassifier({ classifier: "01-03", percent: 45 }));
  //  (97+75+65+45)/4 = 70.5
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    (97 + 75 + 65 + 45) / 4,
  );

  // best 4 out of 5
  state.ss.window.push(
    makeClassifier({ classifier: "01-04", percent: 95, sd: "2/01/2023" }),
  );
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    75.4,
  );

  // best 4 out of 6
  state.ss.window.push(
    makeClassifier({ classifier: "01-05", percent: 90, sd: "2/01/2023" }),
  );
  assert.strictEqual(
    percentAndAgesForDivWindow(
      "ss",
      state,
      "percent",
      new Date(),
      "uspsa",
    ).percent.toFixed(2),
    "77.83",
  );

  // best 6 out of 7
  state.ss.window.push(
    makeClassifier({ classifier: "01-06", percent: 30, sd: "2/01/2023" }),
  );
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    (97 + 95 + 90 + 75 + 65 + 45) / 6,
  );

  // best 6 out of 8 capped
  state.ss.window.push(
    makeClassifier({ classifier: "01-07", percent: 114, sd: "2/01/2023" }),
  );
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    (100 + 97 + 95 + 90 + 75 + 65) / 6,
  );

  // another duplicate
  state.ss.window.push(
    makeClassifier({ classifier: "01-07", percent: 99, sd: "2/01/2023" }),
  );
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    (100 + 97 + 95 + 90 + 75 + 65) / 6,
  );

  // uncapped vs capped
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa+uncapped")
      .percent,
    (114 + 97 + 95 + 90 + 75 + 65) / 6,
  );
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    (100 + 97 + 95 + 90 + 75 + 65) / 6,
  );
});

test("percentAndAgesForDivWindow w/ weighted by round count", () => {
  const state = newClassificationCalculationState();
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    0,
  );

  const sd = "2/01/2023";
  state.ss.window.push(
    makeClassifier({ classifier: "22-05", recPercent: 80, percent: 60, sd: "2/01/2023" }), // 24
    makeClassifier({ classifier: "20-01", recPercent: 95, percent: 75, sd: "2/01/2023" }), // 12
    makeClassifier({ classifier: "99-24", recPercent: 110, percent: 90, sd }), // 12
    makeClassifier({ classifier: "99-62", recPercent: 120, percent: 100, sd }), // 6
    makeClassifier({ classifier: "06-10", recPercent: 120, percent: 100, sd }), // 6
  );

  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa").percent,
    85,
  );
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "percent", new Date(), "uspsa+weighted")
      .percent,
    77,
  );
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "recPercent", new Date(), "brutal").percent,
    95,
  );
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "recPercent", new Date(), "brutal+weighted")
      .percent,
    91,
  );
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "recPercent", new Date(), "brutal+uncapped")
      .percent,
    105,
  );
  assert.strictEqual(
    percentAndAgesForDivWindow(
      "ss",
      state,
      "recPercent",
      new Date(),
      "brutal+uncapped+weighted",
    ).percent,
    97,
  );
});

test("percentAndAgesForDivWindow + percentField", () => {
  // default to zero
  const state = newClassificationCalculationState();
  state.ss.window.push(makeClassifier({ curPercent: 75 }));
  state.ss.window.push(makeClassifier({ curpercent: 85 }));
  state.ss.window.push(makeClassifier({ curPercent: 95 }));
  state.ss.window.push(makeClassifier({ curPercent: 97 }));
  state.ss.window.push(makeClassifier({ curPercent: 97 }));
  state.ss.window.push(makeClassifier({ classifier: "01-01", curPercent: 75 }));
  state.ss.window.push(makeClassifier({ classifier: "01-02", curPercent: 65 }));
  state.ss.window.push(makeClassifier({ classifier: "01-03", curPercent: 45 }));

  // best 4 out of 5
  state.ss.window.push(
    makeClassifier({ classifier: "01-04", curPercent: 95, sd: "2/01/2023" }),
  );

  state.ss.window.push(
    makeClassifier({ classifier: "01-05", curPercent: 90, sd: "2/01/2023" }),
  );

  // best 6 out of 7
  state.ss.window.push(
    makeClassifier({ classifier: "01-06", curPercent: 30, sd: "2/01/2023" }),
  );
  state.ss.window.push(
    makeClassifier({
      classifier: "01-07",
      curPercent: 100,
      percent: 100,
      sd: "2/01/2023",
    }),
  );
  state.ss.window.push(
    makeClassifier({
      classifier: "01-07",
      curPercent: 99,
      percent: 99,
      sd: "2/01/2023",
    }),
  );

  assert.strictEqual(
    percentAndAgesForDivWindow(
      "ss",
      state,
      "percent",
      new Date(),
      "uspsa",
    ).percent.toFixed(4),
    "79.1658",
  );
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "curPercent", new Date(), "uspsa").percent,
    (100 + 97 + 95 + 90 + 75 + 65) / 6,
  );
});

test("percentAndAgesForDivWindow + recPercent = one latest dupe", () => {
  const state = newClassificationCalculationState();
  state.ss.window.push(makeClassifier({ recPercent: 75, sd: "12/01/01" }));
  state.ss.window.push(makeClassifier({ recpercent: 85, sd: "11/01/01" }));
  state.ss.window.push(makeClassifier({ recPercent: 95, sd: "10/01/01" }));
  state.ss.window.push(makeClassifier({ recPercent: 97, sd: "09/01/01" }));
  state.ss.window.push(makeClassifier({ recPercent: 97, sd: "09/01/01" }));
  state.ss.window.push(
    makeClassifier({ classifier: "01-01", recPercent: 75, sd: "09/01/01" }),
  );
  state.ss.window.push(
    makeClassifier({ classifier: "01-02", recPercent: 75, sd: "09/01/01" }),
  );
  state.ss.window.push(
    makeClassifier({ classifier: "01-03", recPercent: 75, sd: "09/01/01" }),
  );
  state.ss.window.push(
    makeClassifier({ classifier: "01-04", recPercent: 75, sd: "09/01/01" }),
  );
  state.ss.window.push(
    makeClassifier({ classifier: "01-05", recPercent: 75, sd: "09/01/01" }),
  );
  state.ss.window.sort((a, b) => dateSort(a, b, "sd", -1));
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "recPercent", new Date(), "brutal").percent,
    75,
  );
  state.ss.window.push(makeClassifier({ recPercent: 45, sd: "12/12/12" }));
  state.ss.window.sort((a, b) => dateSort(a, b, "sd", -1));
  assert.strictEqual(
    percentAndAgesForDivWindow("ss", state, "recPercent", new Date(), "brutal").percent,
    70,
  );
});

test("numberOfDuplicates", () => {
  assert.strictEqual(numberOfDuplicates([makeClassifier()]), 0);
  assert.strictEqual(numberOfDuplicates([makeClassifier(), makeClassifier()]), 1);
  assert.strictEqual(
    numberOfDuplicates([makeClassifier(), makeClassifier(), makeClassifier()]),
    2,
  );
  assert.strictEqual(
    numberOfDuplicates([
      makeClassifier(),
      makeClassifier(),
      makeClassifier(),
      makeClassifier(),
    ]),
    3,
  );
  assert.strictEqual(
    numberOfDuplicates([
      makeClassifier(),
      makeClassifier(),
      makeClassifier(),
      makeClassifier(),
      makeClassifier({ classifier: "23-01" }),
    ]),
    3,
  );
  assert.strictEqual(
    numberOfDuplicates([
      makeClassifier(),
      makeClassifier(),
      makeClassifier(),
      makeClassifier(),
      makeClassifier({ classifier: "23-01" }),
      makeClassifier({ classifier: "23-01" }),
    ]),
    4,
  );

  assert.strictEqual(
    numberOfDuplicates([
      makeClassifier(),
      makeClassifier(),
      makeClassifier(),
      makeClassifier(),
      makeClassifier({ classifier: "23-01" }),
      makeClassifier({ classifier: "23-01" }),
      makeClassifier({ classifier: "23-02" }),
      makeClassifier({ classifier: "23-02" }),
      makeClassifier({ classifier: "23-02" }),
      makeClassifier({ classifier: "23-02" }),
    ]),
    7,
  );

  assert.strictEqual(
    numberOfDuplicates([
      {
        classifier: "20-03",
        sd: "1/01/23",
        percent: 74.999,
        division: "ss",
      },
      {
        classifier: "20-04",
        sd: "1/01/23",
        percent: 74.999,
        division: "ss",
      },
      {
        classifier: "20-05",
        sd: "1/01/23",
        percent: 74.999,
        division: "ss",
      },
      {
        classifier: "20-06",
        sd: "1/01/23",
        percent: 74.999,
        division: "ss",
      },
      {
        classifier: "20-07",
        sd: "1/01/23",
        percent: 74.999,
        division: "ss",
      },
      {
        classifier: "20-08",
        sd: "1/01/23",
        percent: 74.999,
        division: "ss",
      },
      {
        classifier: "20-09",
        sd: "1/01/23",
        percent: 74.999,
        division: "ss",
      },
      {
        classifier: "20-02",
        sd: "1/01/23",
        percent: 74.999,
        division: "ss",
      },
      {
        classifier: "20-10",
        sd: "1/01/23",
        percent: 74.999,
        division: "ss",
      },
    ]),
    0,
  );
});

test("addToCurWindow", () => {
  const curWindow = [];
  addToCurWindow(makeClassifier(), curWindow);
  assert.deepEqual(curWindow, [makeClassifier()]);

  addToCurWindow(makeClassifier({ classifier: "20-02" }), curWindow);
  addToCurWindow(makeClassifier({ classifier: "20-03" }), curWindow);
  addToCurWindow(makeClassifier({ classifier: "20-04" }), curWindow);
  addToCurWindow(makeClassifier({ classifier: "20-05" }), curWindow);
  addToCurWindow(makeClassifier({ classifier: "20-06" }), curWindow);
  addToCurWindow(makeClassifier({ classifier: "20-07" }), curWindow);
  addToCurWindow(makeClassifier({ classifier: "20-08" }), curWindow);

  assert.strictEqual(curWindow.length, 8);
  addToCurWindow(makeClassifier({ classifier: "20-09" }), curWindow);
  assert.strictEqual(curWindow.length, 8);
  assert.deepEqual(curWindow, [
    makeClassifier({ classifier: "20-02" }),
    makeClassifier({ classifier: "20-03" }),
    makeClassifier({ classifier: "20-04" }),
    makeClassifier({ classifier: "20-05" }),
    makeClassifier({ classifier: "20-06" }),
    makeClassifier({ classifier: "20-07" }),
    makeClassifier({ classifier: "20-08" }),
    makeClassifier({ classifier: "20-09" }),
  ]);

  addToCurWindow(makeClassifier({ classifier: "20-09" }), curWindow);
  assert.strictEqual(curWindow.length, 9);
  addToCurWindow(makeClassifier({ classifier: "20-10" }), curWindow);
  assert.strictEqual(curWindow.length, 9);
  assert.deepEqual(curWindow, [
    makeClassifier({ classifier: "20-03" }),
    makeClassifier({ classifier: "20-04" }),
    makeClassifier({ classifier: "20-05" }),
    makeClassifier({ classifier: "20-06" }),
    makeClassifier({ classifier: "20-07" }),
    makeClassifier({ classifier: "20-08" }),
    makeClassifier({ classifier: "20-09" }),
    makeClassifier({ classifier: "20-09" }),
    makeClassifier({ classifier: "20-10" }),
  ]);
  addToCurWindow(makeClassifier({ classifier: "20-02" }), curWindow);
  addToCurWindow(makeClassifier({ classifier: "20-02" }), curWindow);
  assert.strictEqual(curWindow.length, 10);
  addToCurWindow(makeClassifier({ classifier: "21-01" }), curWindow);
  assert.strictEqual(curWindow.length, 10);
  assert.deepEqual(curWindow, [
    makeClassifier({ classifier: "20-05" }),
    makeClassifier({ classifier: "20-06" }),
    makeClassifier({ classifier: "20-07" }),
    makeClassifier({ classifier: "20-08" }),
    makeClassifier({ classifier: "20-09" }),
    makeClassifier({ classifier: "20-09" }),
    makeClassifier({ classifier: "20-10" }),
    makeClassifier({ classifier: "20-02" }),
    makeClassifier({ classifier: "20-02" }),
    makeClassifier({ classifier: "21-01" }),
  ]);
});

test("calculateUSPSAClassification", () => {
  const result = calculateUSPSAClassification(
    testData,
    "percent",
    new Date(),
    "uspsa",
    8,
  );
  assert.strictEqual(Number(result.ltd.percent.toFixed(2)), 93.54);
  assert.strictEqual(Number(result.ltd.highPercent.toFixed(2)), 93.72);

  assert.strictEqual(Number(result.prod.percent.toFixed(2)), 91.68);
  assert.strictEqual(Number(result.prod.highPercent.toFixed(2)), 94.33);

  assert.strictEqual(Number(result.co.percent.toFixed(2)), 100.0);
  assert.strictEqual(Number(result.co.highPercent.toFixed(2)), 100.0);

  assert.strictEqual(Number(result.lo.percent.toFixed(2)), 96.23);
  assert.strictEqual(Number(result.lo.highPercent.toFixed(2)), 96.23);
  // TODO: add more testData real people, if edge cases are detected
});

test("calculateUSPSAClassification + percentField", () => {
  const result = calculateUSPSAClassification(
    testData,
    "curPercent",
    new Date(),
    "uspsa",
    8,
  );
  assert.strictEqual(Number(result.ltd.percent.toFixed(2)), 93.16);
  assert.strictEqual(Number(result.ltd.highPercent.toFixed(2)), 93.33);

  assert.strictEqual(Number(result.prod.percent.toFixed(2)), 90.7);
  assert.strictEqual(Number(result.prod.highPercent.toFixed(2)), 93.32);

  assert.strictEqual(Number(result.co.percent.toFixed(2)), 100);
  assert.strictEqual(Number(result.co.highPercent.toFixed(2)), 100);

  assert.strictEqual(Number(result.lo.percent.toFixed(2)), 96.23);
  assert.strictEqual(Number(result.lo.highPercent.toFixed(2)), 96.23);
  // TODO: add more testData real people, if edge cases are detected
});

test("calculateUSPSAClassification + percentField + ages", () => {
  const result = calculateUSPSAClassification(
    testData,
    "curPercent",
    new Date("4/20/2024"),
    "uspsa",
    8,
  );
  const longResult = calculateUSPSAClassification(
    testData,
    "curPercent",
    new Date("4/20/2028"),
    "uspsa",
    8,
  );
  assert.strictEqual(Number(result.ltd.age.toFixed(2)), 32.61);
  assert.strictEqual(Number(result.ltd.age1.toFixed(2)), 28);
  assert.strictEqual(Number(longResult.ltd.age.toFixed(2)), 84.79);
  assert.strictEqual(Number(result.prod.age.toFixed(2)), 31.53);
  assert.strictEqual(Number(result.prod.age1.toFixed(2)), 2);
  assert.strictEqual(Number(result.co.age.toFixed(2)), 9.9);
  assert.strictEqual(Number(result.co.age1.toFixed(2)), 7.79);
  assert.strictEqual(Number(result.lo.age.toFixed(2)), 3.96);
  assert.strictEqual(Number(result.lo.age1.toFixed(2)), 2);
});

test("calculateUSPSAClassification + percentField + age1 + only1classifier", () => {
  const result = calculateUSPSAClassification(
    testData.slice(0, 1),
    "curPercent",
    new Date("4/20/2024"),
    "uspsa",
    8,
  );
  assert.strictEqual(Number(result.ltd.age?.toFixed(2)), NaN);
  assert.strictEqual(Number(result.ltd.age1.toFixed(2)), 27.39);
});

test("calculateUSPSAClassification + percentField + dates", () => {
  const result = calculateUSPSAClassification(
    testData,
    "curPercent",
    new Date(),
    "uspsa",
    8,
  );
  assert.deepEqual(result.co.percentWithDates, [
    { p: 0, sd: "3/26/22" },
    { p: 58.93750000000001, sd: "3/26/22" },
    { p: 64.37599999999999, sd: "3/26/22" },
    { p: 64.37599999999999, sd: "3/26/22" },
    { p: 68.70666666666666, sd: "3/26/22" },
    { p: 80.42636666666667, sd: "4/07/22" },
    { p: 83.66803333333334, sd: "5/17/22" },
    { p: 86.83803333333333, sd: "5/21/22" },
    { p: 88.1747, sd: "6/25/22" },
    { p: 88.91499999999999, sd: "7/02/22" },
    { p: 89.16333333333333, sd: "7/16/22" },
    { p: 91.68666666666667, sd: "7/19/22" },
    { p: 93.02833333333334, sd: "8/06/22" },
    { p: 94.615, sd: "8/16/22" },
    { p: 95.07666666666667, sd: "8/20/22" },
    { p: 96.02246666666666, sd: "9/02/22" },
    { p: 96.4808, sd: "9/20/22" },
    { p: 97.20913333333333, sd: "10/18/22" },
    { p: 97.1058, sd: "10/22/22" },
    { p: 97.1058, sd: "1/07/23" },
    { p: 98.02913333333333, sd: "1/21/23" },
    { p: 98.32166666666667, sd: "1/28/23" },
    { p: 98.34166666666667, sd: "3/04/23" },
    { p: 99.045, sd: "3/23/23" },
    { p: 99.045, sd: "4/18/23" },
    { p: 99.045, sd: "5/06/23" },
    { p: 98.25006666666667, sd: "5/11/23" },
    { p: 98.25006666666667, sd: "5/27/23" },
    { p: 98.29673333333334, sd: "6/03/23" },
    { p: 98.96340000000001, sd: "7/15/23" },
    { p: 98.96340000000001, sd: "7/18/23" },
    { p: 98.96340000000001, sd: "8/26/23" },
    { p: 100.00000000000001, sd: "9/15/23" },
  ]);
});

test("calculateUSPSAClassification CS should have curPercent", () => {
  const result = calculateUSPSAClassification(
    csClassifiers,
    "curPercent",
    new Date(),
    "uspsa",
    8,
  );
  assert.strictEqual(Number(result.co.percent.toFixed(2)), 97.55);
});

test("calculateUSPSAClassification CS should have curPercent in Open", () => {
  const result = calculateUSPSAClassification(
    csOpenClassifiers,
    "curPercent",
    new Date(),
    "uspsa",
    8,
  );
  assert.strictEqual(Number(result.opn.percent.toFixed(2)), 100);
});

test("calculateUSPSAClassification CS should have higher uncapped curPercent in Open", () => {
  const result = calculateUSPSAClassification(
    csOpenClassifiers,
    "curPercent",
    new Date(),
    "uspsa+uncapped",
    8,
  );
  assert.strictEqual(Number(result.opn.percent.toFixed(2)), 100.91);
});

test("calculateUSPSAClassification CS should have higher different uncapped+weighted curPercent in Open", () => {
  const result = calculateUSPSAClassification(
    csOpenClassifiers,
    "curPercent",
    new Date(),
    "uspsa+uncapped+weighted",
    8,
  );
  assert.strictEqual(Number(result.opn.percent.toFixed(2)), 100.3);
});

test("calculateUSPSAClassification A111317 should have co", () => {
  const result = calculateUSPSAClassification(
    noCurPercentButExpected,
    "curPercent",
    new Date(),
    "uspsa",
    8,
  );
  assert.strictEqual(Number(result.co.percent.toFixed(2)), 72.6);
});
