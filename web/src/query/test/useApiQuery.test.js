import assert from "assert";
import test from "node:test";

import { queryKeyForPathAndQueryString } from "../useApiQuery";

test("queryKeyForEndpoint", () => {
  assert.deepEqual(queryKeyForPathAndQueryString(""), []);
  assert.deepEqual(
    queryKeyForPathAndQueryString(
      "/api/shooters/co?order=-1&sort=reclassificationsRecPercentCurrent&page=1&classFilter&filter=&inconsistencies=recClass-paper",
    ),
    [
      "api",
      "shooters",
      "co",
      "order=-1",
      "sort=reclassificationsRecPercentCurrent",
      "page=1",
      "inconsistencies=recClass-paper",
    ],
  );
});
