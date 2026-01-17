import assert from "assert";
import { describe, it } from "node:test";

import { dateSort } from "@shared/utils/sort";

import testData, {
  csClassifiers,
  csOpenClassifiers,
  noCurPercentButExpected,
} from "./data";
import { makeClassifier } from "./utils";

import {
  calculateUSPSAClassification,
  dedupeGrandbagging,
  percentAndAgesForDivWindow,
} from "../engine";
import { initialClassificationStateForDivision } from "../state";

describe("classification engine", () => {
  describe("percentAndAgesForDivWindow", () => {
    it("defaults to zero when there are not enough unique classifiers", () => {
      // default to zero
      const state = { ss: initialClassificationStateForDivision() };
      assert.strictEqual(percentAndAgesForDivWindow("ss", state).percent, 0);

      // single classifier
      state.ss.window.push(makeClassifier({ percent: 50 }));
      assert.strictEqual(percentAndAgesForDivWindow("ss", state).percent, 0);

      // best of same single classifier duplicates
      state.ss.window = [];
      state.ss.window.push(makeClassifier({ percent: 75 }));
      assert.strictEqual(percentAndAgesForDivWindow("ss", state).percent, 0);
      state.ss.window.push(makeClassifier({ percent: 85 }));
      state.ss.window.push(makeClassifier({ percent: 95 }));
      state.ss.window.push(makeClassifier({ percent: 97 }));
      state.ss.window.push(makeClassifier({ percent: 97 }));
      assert.strictEqual(percentAndAgesForDivWindow("ss", state).percent, 0);
    });

    it("calculates average with enough scores", () => {
      // average of 4 unique
      const state = { ss: initialClassificationStateForDivision() };
      state.ss.window.push(makeClassifier({ percent: 97 }));
      state.ss.window.push(makeClassifier({ classifier: "01-01", percent: 75 }));
      state.ss.window.push(makeClassifier({ classifier: "01-02", percent: 65 }));
      state.ss.window.push(makeClassifier({ classifier: "01-03", percent: 45 }));
      //  (97+75+65+45)/4 = 70.5
      assert.strictEqual(
        percentAndAgesForDivWindow("ss", state).percent,
        (97 + 75 + 65 + 45) / 4,
      );

      // best 4 out of 5
      state.ss.window.push(
        makeClassifier({ classifier: "01-04", percent: 95, sd: "2/01/2023" }),
      );
      assert.strictEqual(percentAndAgesForDivWindow("ss", state).percent, 75.4);

      // best 4 out of 6
      state.ss.window.push(
        makeClassifier({ classifier: "01-05", percent: 90, sd: "2/01/2023" }),
      );
      assert.strictEqual(
        percentAndAgesForDivWindow("ss", state).percent.toFixed(2),
        "77.83",
      );

      // best 6 out of 7
      state.ss.window.push(
        makeClassifier({ classifier: "01-06", percent: 30, sd: "2/01/2023" }),
      );
      assert.strictEqual(
        percentAndAgesForDivWindow("ss", state).percent,
        (97 + 95 + 90 + 75 + 65 + 45) / 6,
      );

      // best 6 out of 8 capped
      state.ss.window.push(
        makeClassifier({ classifier: "01-07", percent: 114, sd: "2/01/2023" }),
      );
      assert.strictEqual(
        percentAndAgesForDivWindow("ss", state).percent,
        (100 + 97 + 95 + 90 + 75 + 65) / 6,
      );

      // another duplicate
      state.ss.window.push(
        makeClassifier({ classifier: "01-07", percent: 99, sd: "2/01/2023" }),
      );
      assert.strictEqual(
        percentAndAgesForDivWindow("ss", state).percent,
        (100 + 97 + 95 + 90 + 75 + 65) / 6,
      );

      // uncapped vs capped
      assert.strictEqual(
        percentAndAgesForDivWindow("ss", state, new Date(), 4, 6, 120).percent,
        (114 + 97 + 95 + 90 + 75 + 65) / 6,
      );
      assert.strictEqual(
        percentAndAgesForDivWindow("ss", state).percent,
        (100 + 97 + 95 + 90 + 75 + 65) / 6,
      );

      const anotherState = { ss: initialClassificationStateForDivision() };
      anotherState.ss.window = [
        makeClassifier({ classifier: "22-05", percent: 80 }),
        makeClassifier({ classifier: "20-01", percent: 95 }),
        makeClassifier({ classifier: "99-24", percent: 110 }),
        makeClassifier({ classifier: "99-62", percent: 120 }),
        makeClassifier({ classifier: "06-10", percent: 120 }),
      ];

      assert.strictEqual(
        percentAndAgesForDivWindow("ss", anotherState, new Date()).percent,
        95,
      );
      assert.strictEqual(
        percentAndAgesForDivWindow("ss", anotherState, new Date(), 4, 6, 120).percent,
        105,
      );
    });

    const lastState = { ss: initialClassificationStateForDivision() };
    lastState.ss.window.push(makeClassifier({ percent: 75, sd: "12/01/01" }));
    lastState.ss.window.push(makeClassifier({ percent: 85, sd: "11/01/01" }));
    lastState.ss.window.push(makeClassifier({ percent: 95, sd: "10/01/01" }));
    lastState.ss.window.push(makeClassifier({ percent: 97, sd: "09/01/01" }));
    lastState.ss.window.push(makeClassifier({ percent: 97, sd: "09/01/01" }));
    lastState.ss.window.push(
      makeClassifier({ classifier: "01-01", percent: 75, sd: "09/01/01" }),
    );
    lastState.ss.window.push(
      makeClassifier({ classifier: "01-02", percent: 75, sd: "09/01/01" }),
    );
    lastState.ss.window.push(
      makeClassifier({ classifier: "01-03", percent: 75, sd: "09/01/01" }),
    );
    lastState.ss.window.push(
      makeClassifier({ classifier: "01-04", percent: 75, sd: "09/01/01" }),
    );
    lastState.ss.window.push(
      makeClassifier({ classifier: "01-05", percent: 75, sd: "09/01/01" }),
    );
    lastState.ss.window.sort((a, b) => dateSort(a, b, "sd", -1));
    assert.strictEqual(percentAndAgesForDivWindow("ss", lastState).percent, 75);
    lastState.ss.window.push(makeClassifier({ percent: 45, sd: "12/12/12" }));
    lastState.ss.window.sort((a, b) => dateSort(a, b, "sd", -1));
    assert.strictEqual(percentAndAgesForDivWindow("ss", lastState).percent, 70);
  });

  it("goes above 100 percent in uncapped mode", () => {
    const state = { ss: initialClassificationStateForDivision() };
    state.ss.window = [
      makeClassifier({ percent: 97 }),
      makeClassifier({ classifier: "01-01", percent: 75 }),
      makeClassifier({ classifier: "01-02", percent: 65 }),
      makeClassifier({ classifier: "01-03", percent: 45 }),
      makeClassifier({ classifier: "01-04", percent: 95, sd: "2/01/2023" }),
      makeClassifier({ classifier: "01-05", percent: 90, sd: "2/01/2023" }),
      makeClassifier({ classifier: "01-06", percent: 30, sd: "2/01/2023" }),
      makeClassifier({ classifier: "01-07", percent: 114, sd: "2/01/2023" }),
    ];

    assert.strictEqual(
      percentAndAgesForDivWindow("ss", state, new Date(), 4, 6, 120).percent,
      (114 + 97 + 95 + 90 + 75 + 65) / 6,
    );
    assert.strictEqual(
      percentAndAgesForDivWindow("ss", state).percent,
      (100 + 97 + 95 + 90 + 75 + 65) / 6,
    );
  });

  it("uses most recent duplicates", () => {
    const state = { ss: initialClassificationStateForDivision() };
    state.ss.window = [
      makeClassifier({ classifier: "01-01", percent: 75, sd: "1/01/2023" }),
      makeClassifier({ classifier: "01-02", percent: 65, sd: "1/02/2023" }),
      makeClassifier({ classifier: "01-03", percent: 45, sd: "1/03/2023" }),
      makeClassifier({ classifier: "01-04", percent: 95, sd: "1/04/2023" }),
      makeClassifier({ classifier: "01-05", percent: 90, sd: "1/05/2023" }),
      makeClassifier({ classifier: "01-06", percent: 30, sd: "1/06/2023" }),
      makeClassifier({ classifier: "01-01", percent: 55, sd: "1/09/2023" }),
      makeClassifier({ classifier: "01-02", percent: 45, sd: "1/10/2023" }),
      makeClassifier({ classifier: "01-03", percent: 25, sd: "1/11/2023" }),
      makeClassifier({ classifier: "01-04", percent: 75, sd: "1/12/2023" }),
    ];

    assert.strictEqual(
      percentAndAgesForDivWindow("ss", state).percent,
      (55 + 45 + 25 + 75 + 90 + 30) / 6,
    );
  });

  describe("calculateUSPSAClassification", () => {
    it("distinguishes high/current percentages", () => {
      const filler = { source: "Stage Score", recPercent: 0, curPercent: 0 };
      const result = calculateUSPSAClassification(
        [
          {
            classifier: "99-11",
            sd: "3/15/22",
            percent: 53.7336,
            division: "ltd",
            ...filler,
          },
          {
            classifier: "21-01",
            sd: "2/26/22",
            percent: 100,
            division: "ltd",
            ...filler,
          },
          {
            classifier: "99-28",
            sd: "2/05/22",
            percent: 41.4217,
            division: "ltd",
            ...filler,
          },
          {
            classifier: "09-08",
            sd: "1/15/22",
            percent: 81.1856,
            division: "ltd",
            ...filler,
          },
          {
            classifier: "99-07",
            sd: "11/20/21",
            percent: 93.3774,
            division: "ltd",
            ...filler,
          },
          {
            classifier: "13-08",
            sd: "11/16/21",
            percent: 19.7826,
            division: "ltd",
            ...filler,
          },
        ],
        new Date(),
        4,
        6,
        8,
      );
      assert.strictEqual(
        Number(result.ltd.percent.toFixed(2)),
        Number(((53.7336 + 100 + 41.4217 + 81.1856 + 93.3774 + 19.7826) / 6).toFixed(2)),
      );
      assert.strictEqual(
        Number(result.ltd.highPercent.toFixed(2)),
        Number(((100 + 41.4217 + 81.1856 + 93.3774 + 19.7826) / 5).toFixed(2)),
      );
    });

    it("works with real-life test data", () => {
      const result = calculateUSPSAClassification(
        testData.map(cur => ({
          ...cur,
          percent: cur.source === "Stage Score" ? cur.curPercent : cur.percent,
        })),
        new Date(),
        4,
        6,
        8,
      );
      assert.strictEqual(Number(result.ltd.percent.toFixed(2)), 65.52);
      assert.strictEqual(Number(result.ltd.highPercent.toFixed(2)), 84.93);

      assert.strictEqual(Number(result.prod.percent.toFixed(2)), 84.49);
      assert.strictEqual(Number(result.prod.highPercent.toFixed(2)), 88.57);

      assert.strictEqual(Number(result.co.percent.toFixed(2)), 96.56);
      assert.strictEqual(Number(result.co.highPercent.toFixed(2)), 98.28);

      assert.strictEqual(Number(result.lo.percent.toFixed(2)), 95.85);
      assert.strictEqual(Number(result.lo.highPercent.toFixed(2)), 95.85);
    });

    it("calculates classification ages in months", () => {
      const result = calculateUSPSAClassification(
        testData.map(cur => ({
          ...cur,
          percent: cur.source === "Stage Score" ? cur.curPercent : cur.percent,
        })),
        new Date("4/20/2024"),
        4,
        6,
        8,
      );
      const longResult = calculateUSPSAClassification(
        testData.map(cur => ({
          ...cur,
          percent: cur.source === "Stage Score" ? cur.curPercent : cur.percent,
        })),
        new Date("4/20/2028"),
        4,
        6,
        8,
      );
      assert.strictEqual(Number(result.ltd.age.toFixed(2)), 29.46);
      assert.strictEqual(Number(result.ltd.age1.toFixed(2)), 27.39);
      assert.strictEqual(Number(longResult.ltd.age.toFixed(2)), 81.64);
      assert.strictEqual(Number(result.prod.age.toFixed(2)), 29.54);
      assert.strictEqual(Number(result.prod.age1.toFixed(2)), 2);
      assert.strictEqual(Number(result.co.age.toFixed(2)), 9.05);
      assert.strictEqual(Number(result.co.age1.toFixed(2)), 7.79);
      assert.strictEqual(Number(result.lo.age.toFixed(2)), 3.28);
      assert.strictEqual(Number(result.lo.age1.toFixed(2)), 2);
    });

    it("calculates historical classifications", () => {
      const result = calculateUSPSAClassification(
        testData.map(cur => ({
          ...cur,
          percent: cur.source === "Stage Score" ? cur.curPercent : cur.percent,
        })),
      );
      assert.notDeepEqual([{ foo: "bar" }], [{ foo: "baz" }]);
      assert.equal(result.co.percentWithDates.length, 61);

      assert.deepEqual(
        result.co.percentWithDates.map(c => ({ ...c, sd: c.sd.toISOString() })),
        [
          { p: 58.93750000000001, sd: "2022-03-26T06:00:00.000Z" },
          { p: 64.376, sd: "2022-03-26T06:00:00.000Z" },
          { p: 68.70666666666668, sd: "2022-03-26T06:00:00.000Z" },
          { p: 79.39333333333333, sd: "2022-04-02T06:00:00.000Z" },
          { p: 80.48636666666668, sd: "2022-04-07T06:00:00.000Z" },
          { p: 83.70303333333334, sd: "2022-05-17T06:00:00.000Z" },
          { p: 86.83803333333333, sd: "2022-05-21T06:00:00.000Z" },
          { p: 86.83803333333333, sd: "2022-05-28T06:00:00.000Z" },
          { p: 87.10803333333332, sd: "2022-06-04T06:00:00.000Z" },
          { p: 85.12303333333334, sd: "2022-06-21T06:00:00.000Z" },
          { p: 84.36303333333335, sd: "2022-06-25T06:00:00.000Z" },
          { p: 86.13636666666667, sd: "2022-07-02T06:00:00.000Z" },
          { p: 86.38470000000001, sd: "2022-07-16T06:00:00.000Z" },
          { p: 84.47333333333333, sd: "2022-07-19T06:00:00.000Z" },
          { p: 90.76166666666667, sd: "2022-07-19T06:00:00.000Z" },
          { p: 88.10833333333335, sd: "2022-07-23T06:00:00.000Z" },
          { p: 90.57166666666667, sd: "2022-08-06T06:00:00.000Z" },
          { p: 90.57166666666667, sd: "2022-08-16T06:00:00.000Z" },
          { p: 91.03333333333335, sd: "2022-08-20T06:00:00.000Z" },
          { p: 91.03333333333335, sd: "2022-08-27T06:00:00.000Z" },
          { p: 87.23663333333333, sd: "2022-09-02T06:00:00.000Z" },
          { p: 91.69065, sd: "2022-09-07T06:00:00.000Z" },
          { p: 89.87398333333333, sd: "2022-09-20T06:00:00.000Z" },
          { p: 90.85731666666668, sd: "2022-09-24T06:00:00.000Z" },
          { p: 86.54731666666665, sd: "2022-10-15T06:00:00.000Z" },
          { p: 91.58565, sd: "2022-10-18T06:00:00.000Z" },
          { p: 92.45565, sd: "2022-10-22T06:00:00.000Z" },
          { p: 92.45565, sd: "2022-11-15T07:00:00.000Z" },
          { p: 89.97731666666668, sd: "2022-11-19T07:00:00.000Z" },
          { p: 87.80231666666667, sd: "2022-11-26T07:00:00.000Z" },
          { p: 84.09151666666668, sd: "2022-12-10T07:00:00.000Z" },
          { p: 80.58500000000001, sd: "2022-12-17T07:00:00.000Z" },
          { p: 82.39666666666668, sd: "2022-12-20T07:00:00.000Z" },
          { p: 86.895, sd: "2023-01-07T07:00:00.000Z" },
          { p: 89.36666666666667, sd: "2023-01-17T07:00:00.000Z" },
          { p: 90.355, sd: "2023-01-21T07:00:00.000Z" },
          { p: 92.40833333333335, sd: "2023-01-28T07:00:00.000Z" },
          { p: 93.58166666666666, sd: "2023-02-18T07:00:00.000Z" },
          { p: 94.99333333333334, sd: "2023-02-21T07:00:00.000Z" },
          { p: 94.99333333333334, sd: "2023-02-25T07:00:00.000Z" },
          { p: 97.88666666666666, sd: "2023-03-04T07:00:00.000Z" },
          { p: 94.02166666666665, sd: "2023-03-18T06:00:00.000Z" },
          { p: 96.21999999999998, sd: "2023-03-23T06:00:00.000Z" },
          { p: 95.11666666666666, sd: "2023-04-18T06:00:00.000Z" },
          { p: 95.11666666666666, sd: "2023-04-22T06:00:00.000Z" },
          { p: 94.17333333333333, sd: "2023-05-06T06:00:00.000Z" },
          { p: 94.84173333333332, sd: "2023-05-11T06:00:00.000Z" },
          { p: 94.38673333333334, sd: "2023-05-16T06:00:00.000Z" },
          { p: 95.07006666666666, sd: "2023-05-20T06:00:00.000Z" },
          { p: 95.31506666666667, sd: "2023-05-27T06:00:00.000Z" },
          { p: 95.7034, sd: "2023-06-03T06:00:00.000Z" },
          { p: 94.61173333333333, sd: "2023-06-21T06:00:00.000Z" },
          { p: 94.88753333333334, sd: "2023-06-21T06:00:00.000Z" },
          { p: 97.15253333333332, sd: "2023-07-15T06:00:00.000Z" },
          { p: 98.28246666666666, sd: "2023-07-18T06:00:00.000Z" },
          { p: 98.28246666666666, sd: "2023-07-22T06:00:00.000Z" },
          { p: 98.06746666666668, sd: "2023-08-05T06:00:00.000Z" },
          { p: 94.9858, sd: "2023-08-15T06:00:00.000Z" },
          { p: 94.59746666666666, sd: "2023-08-26T06:00:00.000Z" },
          { p: 94.59746666666666, sd: "2023-09-02T06:00:00.000Z" },
          { p: 96.56333333333333, sd: "2023-09-15T06:00:00.000Z" },
        ],
      );
    });

    it("uses most recent non-same-day duplicate", () => {
      const filler = {
        recPercent: 0,
        curPercent: 0,
        source: "Stage Score",
        memberNumber: "TY123",
        division: "co",
      };
      const scores = [
        { classifier: "18-04", sd: "2021-03-06", percent: 86.15, ...filler },
        { classifier: "03-08", sd: "2021-03-11", percent: 90.36, ...filler },
        { classifier: "03-11", sd: "2021-04-08", percent: 48.97, ...filler },
        { classifier: "99-23", sd: "2021-05-01", percent: 71.49, ...filler },
        { classifier: "99-23", sd: "2021-07-15", percent: 76.03, ...filler },
      ];
      const result = calculateUSPSAClassification(scores);
      assert.strictEqual(result.co.percent, (86.15 + 90.36 + 48.97 + 76.03) / 4);

      const scores2 = [
        { classifier: "18-04", sd: "2021-03-06", percent: 86.15, ...filler },
        { classifier: "03-08", sd: "2021-03-11", percent: 90.36, ...filler },
        { classifier: "03-11", sd: "2021-04-08", percent: 48.97, ...filler },
        { classifier: "99-23", sd: "2021-05-15", percent: 76.03, ...filler },
        { classifier: "99-23", sd: "2021-05-17", percent: 71.49, ...filler },
      ];
      const result2 = calculateUSPSAClassification(scores2);
      assert.strictEqual(
        result2.co.percent.toFixed(4),
        ((86.15 + 90.36 + 48.97 + 71.49) / 4).toFixed(4),
      );
    });

    describe("special cases & bugs", () => {
      it("has CO classification for A111317", () => {
        const result = calculateUSPSAClassification(
          noCurPercentButExpected.map(cur => ({ ...cur, percent: cur.curPercent })),
        );
        assert.strictEqual(Number(result.co.percent.toFixed(2)), 74.8);
      });

      it("has CO classification for CS", () => {
        const result = calculateUSPSAClassification(
          csClassifiers.map(cur => ({
            ...cur,
            percent: cur.source === "Stage Score" ? cur.curPercent : cur.percent,
          })),
        );
        assert.strictEqual(Number(result.co.percent.toFixed(2)), 97.68);
      });

      it("has higher uncapped curPercent for CS in Open ", () => {
        const result = calculateUSPSAClassification(
          csOpenClassifiers.map(cur => ({
            ...cur,
            percent: cur.source === "Stage Score" ? cur.curPercent : cur.percent,
          })),
          new Date(),
          4,
          6,
          8,
          100,
        );
        assert.strictEqual(Number(result.opn.percent.toFixed(2)), 99.83);
        const uncappedResult = calculateUSPSAClassification(
          csOpenClassifiers.map(cur => ({
            ...cur,
            percent: cur.source === "Stage Score" ? cur.curPercent : cur.percent,
          })),
        );
        assert.strictEqual(Number(uncappedResult.opn.percent.toFixed(2)), 100.74);
      });
    });
  });

  describe("dedupeGrandbagging", () => {
    it("reduces total number of scores for classification", () => {
      assert.equal(testData.length, 252);
      const deduped = dedupeGrandbagging(testData);
      assert.equal(deduped.length, 248);
    });

    it("keeps unique scores or different day dupes as-is", () => {
      const filler = {
        source: "Stage Score",
        recPercent: 0,
        curPercent: 0,
        division: "ltd",
      };
      const scores = [
        {
          classifier: "99-11",
          sd: "3/15/22",
          percent: 53.7336,
          ...filler,
        },
        {
          classifier: "99-22",
          sd: "3/15/22",
          percent: 43.7336,
          ...filler,
        },
        {
          classifier: "99-33",
          sd: "3/16/22",
          percent: 23.7336,
          ...filler,
        },
      ];
      const deduped = dedupeGrandbagging(scores);
      assert.equal(deduped.length, 3);
      assert.equal(scores.length, deduped.length);
      assert.deepEqual(scores, deduped);
    });

    it("averages out same day dupes", () => {
      const filler = {
        source: "Stage Score",
        recPercent: 0,
        curPercent: 0,
        division: "ltd",
      };
      const scores = [
        {
          classifier: "99-11",
          sd: "3/15/22",
          percent: 53.7336,
          ...filler,
        },
        {
          classifier: "99-11",
          sd: "3/15/22",
          percent: 43.7336,
          ...filler,
        },
        {
          classifier: "99-33",
          sd: "3/16/22",
          percent: 23.7336,
          ...filler,
        },
      ];
      const deduped = dedupeGrandbagging(scores);
      assert.equal(deduped.length, 2);
      assert.notEqual(scores.length, deduped.length);
      assert.deepEqual(deduped, [
        {
          ...scores[0],
          percent: 48.7336,
        },
        scores[2],
      ]);
    });

    it("dedupes real-life data properly", () => {
      const filler = {
        recPercent: 0,
        curPercent: 0,
        source: "Stage Score",
        memberNumber: "TY123",
        division: "co",
      };
      const scores = [
        { classifier: "18-04", sd: "2021-03-06", percent: 86.15, ...filler },
        { classifier: "03-08", sd: "2021-03-11", percent: 90.36, ...filler },
        { classifier: "03-11", sd: "2021-04-08", percent: 48.97, ...filler },
        { classifier: "99-23", sd: "2021-05-01", percent: 71.49, ...filler },
        { classifier: "99-23", sd: "2021-07-15", percent: 76.03, ...filler },
        { classifier: "99-08", sd: "2021-11-06", percent: 90.54, ...filler },
        { classifier: "18-07", sd: "2021-11-13", percent: 81.82, ...filler },
        { classifier: "99-13", sd: "2021-12-04", percent: 66.66, ...filler },
        { classifier: "19-01", sd: "2022-01-02", percent: 83.23, ...filler },
        { classifier: "21-01", sd: "2022-01-02", percent: 77.66, ...filler },
        { classifier: "18-08", sd: "2022-01-02", percent: 83.43, ...filler },
        { classifier: "19-03", sd: "2022-01-02", percent: 63.33, ...filler },
        { classifier: "03-09", sd: "2022-01-02", percent: 48.72, ...filler },
        { classifier: "20-01", sd: "2022-01-15", percent: 96.21, ...filler },
        { classifier: "09-14", sd: "2022-02-05", percent: 83.27, ...filler },
        { classifier: "09-13", sd: "2022-02-12", percent: 54.31, ...filler },
        { classifier: "03-18", sd: "2022-03-05", percent: 88.94, ...filler },
        { classifier: "18-03", sd: "2022-05-07", percent: 90.22, ...filler },
        { classifier: "03-04", sd: "2022-07-23", percent: 23.03, ...filler },
        { classifier: "09-13", sd: "2022-08-26", percent: 96.89, ...filler },
        { classifier: "99-23", sd: "2022-10-01", percent: 78.69, ...filler },
        { classifier: "99-23", sd: "2022-10-01", percent: 73.37, ...filler },
        { classifier: "99-24", sd: "2023-05-06", percent: 99.99, ...filler },
        { classifier: "06-10", sd: "2023-05-13", percent: 99.99, ...filler },
        { classifier: "06-10", sd: "2023-05-13", percent: 83.57, ...filler },
        { classifier: "09-13", sd: "2023-08-26", percent: 91.35, ...filler },
      ];
      assert.deepEqual(dedupeGrandbagging(scores), [
        { classifier: "18-04", sd: "2021-03-06", percent: 86.15, ...filler },
        { classifier: "03-08", sd: "2021-03-11", percent: 90.36, ...filler },
        { classifier: "03-11", sd: "2021-04-08", percent: 48.97, ...filler },
        { classifier: "99-23", sd: "2021-05-01", percent: 71.49, ...filler },
        { classifier: "99-23", sd: "2021-07-15", percent: 76.03, ...filler },
        { classifier: "99-08", sd: "2021-11-06", percent: 90.54, ...filler },
        { classifier: "18-07", sd: "2021-11-13", percent: 81.82, ...filler },
        { classifier: "99-13", sd: "2021-12-04", percent: 66.66, ...filler },
        { classifier: "19-01", sd: "2022-01-02", percent: 83.23, ...filler },
        { classifier: "21-01", sd: "2022-01-02", percent: 77.66, ...filler },
        { classifier: "18-08", sd: "2022-01-02", percent: 83.43, ...filler },
        { classifier: "19-03", sd: "2022-01-02", percent: 63.33, ...filler },
        { classifier: "03-09", sd: "2022-01-02", percent: 48.72, ...filler },
        { classifier: "20-01", sd: "2022-01-15", percent: 96.21, ...filler },
        { classifier: "09-14", sd: "2022-02-05", percent: 83.27, ...filler },
        { classifier: "09-13", sd: "2022-02-12", percent: 54.31, ...filler },
        { classifier: "03-18", sd: "2022-03-05", percent: 88.94, ...filler },
        { classifier: "18-03", sd: "2022-05-07", percent: 90.22, ...filler },
        { classifier: "03-04", sd: "2022-07-23", percent: 23.03, ...filler },
        { classifier: "09-13", sd: "2022-08-26", percent: 96.89, ...filler },
        { classifier: "99-23", sd: "2022-10-01", percent: 76.03, ...filler },
        { classifier: "99-24", sd: "2023-05-06", percent: 99.99, ...filler },
        { classifier: "06-10", sd: "2023-05-13", percent: 91.78, ...filler },
        { classifier: "09-13", sd: "2023-08-26", percent: 91.35, ...filler },
      ]);
    });
  });
});
