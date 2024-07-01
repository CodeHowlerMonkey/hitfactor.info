import test from "node:test";
import assert from "assert";
import {
  classifierDivisionArrayForHFURecHHFs,
  classifierDivisionArrayWithHFUExtras,
  hfuDivisionCompatabilityMapInversion,
  hfuDivisionExplosionForRecHHF,
  hfuDivisionExplosionForScores,
  hfuDivisionMapForHHF,
  hfuDivisionRecHHFExclusion,
} from "../divisions.js";

const classifierFactory = (classifier, division) => ({
  classifier,
  division,
  classifierDivision: [classifier, division].join(":"),
});

test("classifierDivisionArrayWithExtra", (t) => {
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

test("hfuDivisionCompatabilityMapInversion", (t) => {
  assert.deepEqual(hfuDivisionCompatabilityMapInversion(), {
    comp: ["opn", "pcsl_comp"],
    opt: ["co", "lo", "pcsl_po", "pcsl_acp"],
    irn: ["ltd", "l10", "prod", "ss", "rev", "pcsl_pi"],
    car: ["pcc", "pcsl_pcc"],
  });
  assert.deepEqual(hfuDivisionExplosionForScores, {
    comp: ["opn", "pcsl_comp"],
    opt: ["co", "lo", "pcsl_po", "pcsl_acp"],
    irn: ["ltd", "l10", "prod", "ss", "rev", "pcsl_pi"],
    car: ["pcc", "pcsl_pcc"],
  });

  assert.deepEqual(hfuDivisionCompatabilityMapInversion(hfuDivisionRecHHFExclusion), {
    comp: ["opn", "pcsl_comp"],
    opt: ["co", "lo", "pcsl_po"],
    irn: ["ltd", "pcsl_pi"],
    car: ["pcc", "pcsl_pcc"],
  });
  assert.deepEqual(hfuDivisionExplosionForRecHHF, {
    comp: ["opn", "pcsl_comp"],
    opt: ["co", "lo", "pcsl_po"],
    irn: ["ltd", "pcsl_pi"],
    car: ["pcc", "pcsl_pcc"],
  });
});

test("classifierDivisionArrayForHFURecHHFs", (t) => {
  assert.deepEqual(
    classifierDivisionArrayForHFURecHHFs([classifierFactory("09-01", "co")]),
    ["09-01:co"]
  );

  assert.deepEqual(
    classifierDivisionArrayForHFURecHHFs([classifierFactory("09-01", "opt")]),
    ["09-01:opt", "09-01:co", "09-01:lo", "09-01:pcsl_po"]
  );

  assert.deepEqual(
    classifierDivisionArrayForHFURecHHFs([classifierFactory("09-01", "pcsl_po")]),
    ["09-01:pcsl_po"]
  );
});

test("hfuDivisionMapForHHF", (t) => {
  assert.deepEqual(hfuDivisionMapForHHF, {
    comp: "opn",
    opt: "co",
    irn: "ltd",
    car: "pcc",
  });
});
