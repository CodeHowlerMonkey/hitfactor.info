import test from "node:test";
import assert from "assert";
import { minorHF, targetHitsToLetters } from "../hitfactor.js";

test("targetHitsToLetters", (t) => {
  assert.deepEqual(targetHitsToLetters(0), []);
  assert.deepEqual(targetHitsToLetters(1), ["A"]);
  assert.deepEqual(targetHitsToLetters(2), ["A", "A"]);
  assert.deepEqual(targetHitsToLetters(3), ["A", "A", "A"]);
  assert.deepEqual(targetHitsToLetters(8), ["A", "A", "A", "A", "A", "A", "A", "A"]);

  assert.deepEqual(targetHitsToLetters(257), ["A", "C"]);
  assert.deepEqual(targetHitsToLetters(513), ["A", "C", "C"]);
  assert.deepEqual(targetHitsToLetters(4352), ["C", "D"]);

  assert.deepEqual(targetHitsToLetters(1114113), ["A", "M", "NS"]);
  assert.deepEqual(targetHitsToLetters(2097152), ["M", "M"]);

  assert.deepEqual(targetHitsToLetters(1048832), ["C", "M"]);
  assert.deepEqual(targetHitsToLetters(4352), ["C", "D"]);
});

test("minorHF", (t) => {
  const s = {
    hf: "7.3383",
    steelHits: 0,
    steelMikes: 0,
    steelNPM: 0,
    steelNS: 0,
    strings: [4.17, 3.87],
    targetHits: [4, 4, 259],
  };
  assert.equal(minorHF(s), 7.2139);

  const sWithoutSteel = {
    hf: 6.5744,
    steelHits: 0,
    steelMikes: 0,
    strings: [8.67],
    targetHits: [1048579, 514, 4609, 259],
  };
  assert.equal(minorHF(sWithoutSteel), 5.8824);

  const steelOnly = {
    hf: 5.3571,
    stageTimeSecs: "5.60",
    steelHits: 6,
    steelMikes: 0,
    steelNPM: 0,
    steelNS: 0,
    strings: [5.6],
    targetHits: [],
  };
  assert.equal(minorHF(steelOnly), 5.3571);

  const badMath = {
    hf: 7.0055,
    steelHits: 0,
    steelMikes: 0,
    strings: [7.28],
    targetHits: [4, 4354, 1048579, 4],
  };
  assert.equal(minorHF(badMath), -1);

  const shouldBeGoodWithPenalties = {
    hf: 3.8462,
    penalties: -10,
    steelHits: 0,
    steelMikes: 0,
    strings: [9.88],
    targetHits: [2, 257, 2, 257, 4352, 1048832], // 6A 4C 1D 1M
  };
  assert.equal(minorHF(shouldBeGoodWithPenalties), 3.3401);
});
