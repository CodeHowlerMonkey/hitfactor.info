import assert from "assert";
import test from "node:test";

import { arrayCombination, classifiersAndShootersFromScores } from "../uploads";

const scoreFactory = (classifier, division, memberNumber) => ({
  classifier,
  division,
  memberNumber,
  classifierDivision: [classifier, division].join(":"),
  memberNumberDivision: [memberNumber, division].join(":"),
});

test("arrayCombination", () => {
  assert.deepEqual(
    arrayCombination(["a", "b", "c", "d"], [1, 2], (a, b) => a + b),
    ["a1", "a2", "b1", "b2", "c1", "c2", "d1", "d2"],
  );

  assert.deepEqual(
    arrayCombination(["a"], [1, 2], (a, b) => a + b),
    ["a1", "a2"],
  );

  assert.deepEqual(
    arrayCombination(["a"], [1], (a, b) => a + b),
    ["a1"],
  );
  assert.deepEqual(
    arrayCombination(["a"], [1, 2, 3, 4], (a, b) => a + b),
    ["a1", "a2", "a3", "a4"],
  );
});

test("classifiersAndShootersFromScores", () => {
  const scores = [
    scoreFactory("09-01", "co", "A123"),
    scoreFactory("09-02", "co", "A123"),
    scoreFactory("09-03", "opn", "A123"),
    scoreFactory("09-03", "opn", "A256"),
  ];

  assert.deepEqual(
    classifiersAndShootersFromScores(scores).classifiers.map(c => c.classifierDivision),
    ["09-01:co", "09-02:co", "09-03:opn"],
  );
  assert.deepEqual(
    classifiersAndShootersFromScores(scores).shooters.map(c => c.memberNumberDivision),
    ["A123:co", "A123:opn", "A256:opn"],
  );

  assert.deepEqual(
    classifiersAndShootersFromScores(scores, {}, true).classifiers.map(
      c => c.classifierDivision,
    ),
    ["09-01:co", "09-01:opt", "09-02:co", "09-02:opt", "09-03:opn", "09-03:comp"],
  );
  assert.deepEqual(
    classifiersAndShootersFromScores(scores, {}, true).shooters.map(
      c => c.memberNumberDivision,
    ),
    ["A123:co", "A123:opt", "A123:opn", "A123:comp", "A256:opn", "A256:comp"],
  );
});
