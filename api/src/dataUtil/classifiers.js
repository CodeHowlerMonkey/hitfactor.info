// TODO: rename to scores

import opn from "../../../data/merged.active.open.json" assert { type: "json" };
import limited1 from "../../../data/merged.active.limited.1.json" assert { type: "json" };
import limited2 from "../../../data/merged.active.limited.2.json" assert { type: "json" };
import l10 from "../../../data/merged.active.limited10.json" assert { type: "json" };
import prod from "../../../data/merged.active.production.json" assert { type: "json" };
import ss from "../../../data/merged.active.singlestack.json" assert { type: "json" };
import rev from "../../../data/merged.active.revolver.json" assert { type: "json" };
import co from "../../../data/merged.active.co.json" assert { type: "json" };
import lo from "../../../data/merged.active.limitedoptics.json" assert { type: "json" };
import pcc from "../../../data/merged.active.pcc.json" assert { type: "json" };
import { byMemberNumber } from "./byMemberNumber.js";

// fucking github and its fucking 50Mb file limitation
const ltd = [...limited1, ...limited2];

export const divShortToRuns = {
  opn,
  ltd,
  l10,
  prod,
  ss,
  rev,
  co,
  lo,
  pcc,
  loco: [...co, ...lo],
};

export const divShortToShooterToRuns = {
  opn: byMemberNumber(opn),
  ltd: byMemberNumber(ltd),
  l10: byMemberNumber(l10),
  prod: byMemberNumber(prod),
  ss: byMemberNumber(ss),
  rev: byMemberNumber(rev),
  co: byMemberNumber(co),
  lo: byMemberNumber(lo),
  pcc: byMemberNumber(pcc),
  loco: byMemberNumber([...co, ...lo]),
};
