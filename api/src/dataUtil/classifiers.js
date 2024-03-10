// TODO: rename to scores
import memoize from "memoize";
import { badLazy } from "../utils.js";

import { byMemberNumber } from "./byMemberNumber.js";
import { mapDivisions, mapDivisionsFlat } from "./divisions.js";
import { curHHFForDivisionClassifier } from "./hhf.js";
import { Percent, PositiveOrMinus1 } from "./numbers.js";
import { recommendedHHFFor } from "./recommendedHHF.js";
import { calculateUSPSAClassificationMT } from "./uspsa.js";
import { classifierNumbers } from "./classifiersData.js";
import { getDivShortToRuns } from "./classifiersSource.js";

export const getDivShortToShooterToRuns = badLazy(async () => {
  const divShortToRuns = await getDivShortToRuns();
  const result = {
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
  return result;
});

export const precomputedRecHHFMap = mapDivisions(() => ({}));
export const precomputeRecHHFMap = badLazy(async () => {
  await Promise.all(
    mapDivisionsFlat(
      async (division) =>
        await Promise.all(
          classifierNumbers.map(async (number) => {
            precomputedRecHHFMap[division][number] = await recommendedHHFFor({
              division,
              number,
            });
          })
        )
    )
  );
  return precomputedRecHHFMap;
});

export const getShooterToRuns = badLazy(async () => {
  const divShortToRuns = await getDivShortToRuns();
  const scrumbled = [
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
  ].filter((c) => !!c.division);
  //.filter((c) => c.hf >= 0)

  const recHHFMap = await precomputeRecHHFMap();

  const final = scrumbled.map((c) => {
    const { division, classifier: number } = c;
    if (c.hf) {
      const hhf = curHHFForDivisionClassifier({ division, number });
      c.recHHF = recHHFMap[division]?.[number] || 0;
      c.hhf = hhf;
      c.curPercent = PositiveOrMinus1(Percent(c.hf, hhf));
      if (c.recHHF) {
        c.recPercent = PositiveOrMinus1(Percent(c.hf, c.recHHF));
      } else {
        c.recPercent = 0;
      }
    } else {
      c.hhf = -1;
      c.curPercent = c.source === "Major Match" ? c.percent : -1;
      c.recPercent = c.source === "Major Match" ? c.percent : -1;
    }

    return c;
  });

  return byMemberNumber(final);
});

const getShooterToXXXPercentClassificationsFactory = (field) =>
  badLazy(async () => {
    const shooterToRuns = await getShooterToRuns();
    return Object.fromEntries(
      await Promise.all(
        Object.entries(shooterToRuns).map(async ([memberId, c]) => {
          return [memberId, await calculateUSPSAClassificationMT(c, field)];
        })
      )
    );
  });

/**
 * @returns shooter-to-div-to-curHHFPercent map
 * e.g. {A111: {opn: { percent: 73, highPercent: 75}, ltd: ... }...}
 */
export const getShooterToCurPercentClassifications =
  getShooterToXXXPercentClassificationsFactory("curPercent");

/**
 * @returns shooter-to-div-to-recHHFPercent map
 * e.g. {A111: {opn: { percent: 73, highPercent: 75}, ltd: ... }...}
 */
export const getShooterToRecPercentClassifications =
  getShooterToXXXPercentClassificationsFactory("recPercent");
