import assert from "assert";
import test from "node:test";

import { multisortObj } from "../sort";

test("multisortObj", () => {
  assert.deepEqual(multisortObj(["a", "b"]), { a: -1, b: -1 });
  assert.deepEqual(multisortObj(["a", "b", "c"]), { a: -1, b: -1, c: -1 });
  assert.deepEqual(multisortObj(["a", "b", "c"], [1, 1, -1]), {
    a: 1,
    b: 1,
    c: -1,
  });
  assert.deepEqual(multisortObj(["a", "b", "c"], [2, 1, -1]), {
    a: 1,
    b: 1,
    c: -1,
  });
  assert.deepEqual(multisortObj(["a", "b", "c"], [undefined, NaN, null]), {
    a: -1,
    b: -1,
    c: -1,
  });
  assert.deepEqual(multisortObj(["a", "b", "c"], ["-1", -40, "1"]), {
    a: -1,
    b: -1,
    c: 1,
  });
});
