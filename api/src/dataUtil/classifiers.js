// TODO: rename to scores
import { calculateUSPSAClassification } from "../../../shared/utils/classification.js";
import { badLazy, flatPush, processImport } from "../utils.js";

import { byMemberNumber } from "./byMemberNumber.js";
import { divIdToShort, mapDivisions } from "./divisions.js";
import { curHHFForDivisionClassifier } from "./hhf.js";
import { Percent, PositiveOrMinus1 } from "./numbers.js";

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
            division: divShort,
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

export const getShooterToRuns = badLazy(async () => {
  const divShortToRuns = await getDivShortToRuns();
  const result = byMemberNumber(
    [
      ...divShortToRuns.opn,
      ...divShortToRuns.ltd,
      ...divShortToRuns.l10,
      ...divShortToRuns.prod,
      ...divShortToRuns.ss,
      ...divShortToRuns.rev,
      ...divShortToRuns.co,
      ...divShortToRuns.lo,
      ...divShortToRuns.pcc,
      ...divShortToRuns.loco,
    ]
      .filter((c) => !!c.division)
      //.filter((c) => c.hf >= 0)
      .map((c) => {
        const { division, classifier: number } = c;
        if (c.hf) {
          const hhf = curHHFForDivisionClassifier({ division, number });
          c.hhf = hhf;
          c.curPercent = PositiveOrMinus1(Percent(c.hf, hhf));
        } else {
          c.hhf = -1;
          c.curPercent = c.source === "Major Match" ? c.percent : -1;
        }
        // TODO: c.recPercent = ~ recHHF

        return c;
      })
  );
  return result;
});

/**
 * @returns shooter-to-div-to-curHHFPercent map
 * e.g. {A111: {opn: { percent: 73, highPercent: 75}, ltd: ... }...}
 */
export const getShooterToCurPercentClassifications = badLazy(async () => {
  const shooterToRuns = await getShooterToRuns();
  const result = Object.fromEntries(
    Object.entries(shooterToRuns).map(([memberId, c]) => {
      const calcd = calculateUSPSAClassification(c, "curPercent");
      return [memberId, calcd];
    })
  );
  return result;
});

export const selectClassifierDivisionScores = async ({
  number,
  division,
  includeNoHF,
}) => {
  return (await getDivShortToRuns())[division].filter((run) => {
    if (!run) {
      return false;
    }

    if (!includeNoHF && run.hf < 0) {
      return false;
    }

    return run.classifier === number;
  });
};

// TODO: getShooterToRecPercentClassifications
