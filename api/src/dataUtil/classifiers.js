// TODO: rename to scores
import { loadJSON } from "../utils.js";
import { byMemberNumber } from "./byMemberNumber.js";

export const divShortToRuns = {
  opn: loadJSON("../../data/merged.active.open.json"),
  ltd: [
    // split into 2 files to pass github's 50mb file limit
    ...loadJSON("../../data/merged.active.limited.1.json"),
    ...loadJSON("../../data/merged.active.limited.2.json"),
  ],
  l10: loadJSON("../../data/merged.active.limited10.json"),
  prod: loadJSON("../../data/merged.active.production.json"),
  ss: loadJSON("../../data/merged.active.singlestack.json"),
  rev: loadJSON("../../data/merged.active.revolver.json"),
  co: loadJSON("../../data/merged.active.co.json"),
  lo: loadJSON("../../data/merged.active.limitedoptics.json"),
  pcc: loadJSON("../../data/merged.active.pcc.json"),
  loco: [
    // synthetic division
    ...loadJSON("../../data/merged.active.co.json"),
    ...loadJSON("../../data/merged.active.limitedoptics.json"),
  ],
};

export const divShortToShooterToRuns = {
  opn: byMemberNumber(divShortToRuns.opn),
  ltd: byMemberNumber(divShortToRuns.ltd),
  l10: byMemberNumber(divShortToRuns.l10),
  prod: byMemberNumber(divShortToRuns.prod),
  ss: byMemberNumber(divShortToRuns.ss),
  rev: byMemberNumber(divShortToRuns.rev),
  co: byMemberNumber(divShortToRuns.co),
  lo: byMemberNumber(divShortToRuns.lo),
  pcc: byMemberNumber(divShortToRuns.pcc),
  loco: byMemberNumber(divShortToRuns.loco),
};
