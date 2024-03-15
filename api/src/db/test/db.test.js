import test from "node:test";
import assert from "assert";
import { initDb, memberNumberForId } from "../index.js";

test("db works and allows lookup of member numbers", async () => {
  await initDb();
  const coryK = await memberNumberForId(85193);
  assert.strictEqual(coryK, "L5150");
});
