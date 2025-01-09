import assert from "assert";
import test from "node:test";

import { solveWeibull } from "../weibull";

import oldResults from "./weibull.oldResults.test.data.min.full.json";
import runs from "./weibull.test.data.min.json";

test("new optimization algo", () => {
  assert.equal(true, true);
  let highestDiff = 0;
  let highestRatio = 1;
  for (const division of Object.keys(runs)) {
    for (const classifier of Object.keys(runs[division])) {
      const oldResult = oldResults[division][classifier];
      const newResult = solveWeibull(
        runs[division][classifier],
        0,
        undefined,
        "neldermead",
      );
      const highResult = Math.max(oldResult.hhf5, newResult.hhf5);
      const lowResult = Math.min(oldResult.hhf5, newResult.hhf5);
      const diff = highResult - lowResult;
      const ratio = highResult / lowResult;
      if (diff > highestDiff) {
        highestDiff = diff;
      }
      if (ratio > highestRatio) {
        highestRatio = ratio;
      }
      assert.strictEqual(
        true,
        diff < 0.01 || ratio <= 1.01,
        `not equal: ${division} ${classifier} = ${oldResult.hhf5} ${newResult.hhf5}`,
      );
      assert.strictEqual(
        true,
        oldResult.loss >= newResult.loss,
        `worse loss! Old = ${oldResult.loss}; New = ${newResult.loss}`,
      );
    }
  }
});
