import test from "node:test";
import assert from "assert";

import { reduceByDiv } from "../shooters.js";

test("reduceByDiv", () => {
  const sample = [
    {
      id: "45553",
      division_id: "2",
      division: "Open",
      class: "M",
      current_percent: "0.0000",
      high_percent: "87.7970",
    },
    {
      id: "45554",
      division_id: "3",
      division: "Limited",
      class: "A",
      current_percent: "84.4338",
      high_percent: "84.4338",
    },
    {
      id: "45555",
      division_id: "4",
      division: "Limited 10",
      class: "U",
      current_percent: "0.0000",
      high_percent: "0.0000",
    },
    {
      id: "45556",
      division_id: "5",
      division: "Production",
      class: "A",
      current_percent: "47.2422",
      high_percent: "47.2422",
    },
    {
      id: "45557",
      division_id: "6",
      division: "Revolver",
      class: "U",
      current_percent: "0.0000",
      high_percent: "0.0000",
    },
    {
      id: "45558",
      division_id: "7",
      division: "Single Stack",
      class: "A",
      current_percent: "84.3978",
      high_percent: "84.3978",
    },
    {
      id: "45559",
      division_id: "35",
      division: "Carry Optics",
      class: "U",
      current_percent: "0.0000",
      high_percent: "0.0000",
    },
    {
      id: "45560",
      division_id: "38",
      division: "PCC",
      class: "U",
      current_percent: "0.0000",
      high_percent: "0.0000",
    },
    {
      id: "1192160",
      division_id: "41",
      division: "Limited Optics",
      class: "U",
      current_percent: "0.0000",
      high_percent: "0.0000",
    },
  ];

  assert.deepEqual(
    reduceByDiv(sample, (c) => c.class),
    {
      opn: "M",
      ltd: "A",
      l10: "U",
      prod: "A",
      rev: "U",
      ss: "A",
      co: "U",
      pcc: "U",
      lo: "U",
    }
  );
});
