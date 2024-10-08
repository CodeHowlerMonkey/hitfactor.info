import assert from "assert";
import test from "node:test";

import {
  classifierDivisionArrayForHFURecHHFs,
  classifierDivisionArrayWithHFUExtras,
  divisionsForRecHHFAdapter,
  divisionsForScoresAdapter,
  hfuDivisionCompatabilityMapInversion,
  hfuDivisionExplosionForRecHHF,
  hfuDivisionExplosionForScores,
  hfuDivisionMapForHHF,
  hfuDivisionRecHHFExclusion,
  sportForDivision,
} from "../divisions";

const classifierFactory = (classifier, division) => ({
  classifier,
  division,
  classifierDivision: [classifier, division].join(":"),
});

test("classifierDivisionArrayWithExtra", t => {
  const result = classifierDivisionArrayWithHFUExtras([
    classifierFactory("09-01", "co"),
    classifierFactory("09-01", "co"),
    classifierFactory("09-01", "opn"),
    classifierFactory("09-01", "lo"),
    classifierFactory("09-01", "ltd"),
    classifierFactory("09-02", "opn"),
    classifierFactory("09-02", "ltd"),
    classifierFactory("09-02", "prod"),
  ]);

  assert.deepEqual(result, [
    "09-01:co",
    "09-01:opt",
    "09-01:opn",
    "09-01:comp",
    "09-01:lo",
    "09-01:ltd",
    "09-01:irn",
    "09-02:opn",
    "09-02:comp",
    "09-02:ltd",
    "09-02:irn",
    "09-02:prod",
  ]);
});

test("hfuDivisionCompatabilityMapInversion", t => {
  assert.deepEqual(hfuDivisionCompatabilityMapInversion(), {
    comp: ["comp", "opn", "pcsl_comp"],
    opt: ["opt", "co", "lo", "pcsl_po", "pcsl_acp"],
    irn: ["irn", "ltd", "l10", "prod", "ss", "rev", "pcsl_pi"],
    car: ["car", "pcc", "pcsl_pcc"],
  });
  assert.deepEqual(hfuDivisionExplosionForScores, {
    comp: ["comp", "opn", "pcsl_comp"],
    opt: ["opt", "co", "lo", "pcsl_po", "pcsl_acp"],
    irn: ["irn", "ltd", "l10", "prod", "ss", "rev", "pcsl_pi"],
    car: ["car", "pcc", "pcsl_pcc"],
  });

  assert.deepEqual(hfuDivisionCompatabilityMapInversion(hfuDivisionRecHHFExclusion), {
    comp: ["comp", "opn", "pcsl_comp"],
    opt: ["opt", "co", "lo", "pcsl_po"],
    irn: ["irn", "ltd", "pcsl_pi"],
    car: ["car", "pcc", "pcsl_pcc"],
  });
  assert.deepEqual(hfuDivisionExplosionForRecHHF, {
    comp: ["comp", "opn", "pcsl_comp"],
    opt: ["opt", "co", "lo", "pcsl_po"],
    irn: ["irn", "ltd", "pcsl_pi"],
    car: ["car", "pcc", "pcsl_pcc"],
  });
});

test("classifierDivisionArrayForHFURecHHFs", t => {
  assert.deepEqual(
    classifierDivisionArrayForHFURecHHFs([classifierFactory("09-01", "co")]),
    ["09-01:co"],
  );

  assert.deepEqual(
    classifierDivisionArrayForHFURecHHFs([classifierFactory("09-01", "opt")]),
    ["09-01:opt", "09-01:co", "09-01:lo", "09-01:pcsl_po"],
  );

  assert.deepEqual(
    classifierDivisionArrayForHFURecHHFs([classifierFactory("09-01", "pcsl_po")]),
    ["09-01:pcsl_po"],
  );
});

test("hfuDivisionMapForHHF", t => {
  assert.deepEqual(hfuDivisionMapForHHF, {
    comp: "opn",
    opt: "co",
    irn: "ltd",
    car: "pcc",
  });
});

test("divisionsForScoresAdapter", t => {
  assert.deepEqual(divisionsForScoresAdapter("co"), ["co"]);
  assert.deepEqual(divisionsForScoresAdapter("opt"), [
    "opt",
    "co",
    "lo",
    "pcsl_po",
    "pcsl_acp",
  ]);
});

test("divisionsForRecHHFAdapter", t => {
  assert.deepEqual(divisionsForRecHHFAdapter("co"), ["co"]);
  assert.deepEqual(divisionsForRecHHFAdapter("irn"), ["irn", "ltd", "pcsl_pi"]);
});

test("sportForDivision", t => {
  assert.equal(sportForDivision("co"), "uspsa");
  assert.equal(sportForDivision("opt"), "hfu");
});
