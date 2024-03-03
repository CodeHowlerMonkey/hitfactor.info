// TODO: rename to scores
import { badLazy, flatPush, processImport } from "../utils.js";

import { byMemberNumber } from "./byMemberNumber.js";
import { divIdToShort, mapDivisions } from "./divisions.js";

export const getDivShortToRuns = badLazy(async () => {
  const result = mapDivisions(() => []);
  processImport("../../data/imported", /classifiers\.\d+\.json/, (obj) => {
    const memberNumber = obj?.value?.member_data?.member_number;
    const classifiers = obj?.value?.classifiers;
    classifiers.forEach((divObj) => {
      const divShort = divIdToShort[divObj?.division_id];
      if (!divShort) {
        // new imports have some weird division numbers (1, 10, etc) no idea what that is
        // just skip for now
        return;
      }

      flatPush(
        result[divShort],
        divObj?.division_classifiers?.map(
          ({
            code,
            source,
            hf,
            percent,
            sd,
            clubid,
            club_name,
            classifier,
          }) => ({
            classifier,
            sd,
            clubid,
            club_name,
            percent: Number(percent),
            hf: Number(hf),
            code,
            source,
            memberNumber,
          })
        )
      );
    });
  });
  result.loco = [...result.co, ...result.lo];
  return result;
});

export const getDivShortToShooterToRuns = badLazy(async () => {
  const divShortToRuns = await getDivShortToRuns();
  return {
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
});
