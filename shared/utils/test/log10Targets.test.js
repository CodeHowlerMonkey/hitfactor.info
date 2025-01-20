import assert from "assert";
import test from "node:test";

import { coTargetsFromKirt, log10TargetsHHF } from "../log10Targets";

import runs from "./weibull.test.data.min.json";

test("log10Targets", () => {
  assert.strictEqual(
    log10TargetsHHF(
      runs.ltd["99-16"].map(hf => ({ hf })),
      coTargetsFromKirt,
    ),
    9.021399999987164,
  );
  assert.strictEqual(
    log10TargetsHHF(
      runs.ltd["99-47"].map(hf => ({ hf })),
      coTargetsFromKirt,
    ),
    4.891400000002968,
  );
  assert.strictEqual(
    log10TargetsHHF(
      runs.prod["08-01"].map(hf => ({ hf })),
      coTargetsFromKirt,
    ),
    4.169800000003106,
  );
  assert.strictEqual(
    log10TargetsHHF(
      runs.co["09-09"].map(hf => ({ hf })),
      coTargetsFromKirt,
    ),
    88,
  );
  assert.strictEqual(
    log10TargetsHHF(
      runs.lo["99-14"].map(hf => ({ hf })),
      coTargetsFromKirt,
    ),
    74.66659999995574,
  );
});
