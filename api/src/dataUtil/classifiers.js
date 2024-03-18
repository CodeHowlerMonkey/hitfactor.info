// TODO: rename to scores

import { byMemberNumber } from "./byMemberNumber.js";
import { mapDivisions, mapDivisionsFlat } from "./divisions.js";
import { curHHFForDivisionClassifier } from "./hhf.js";
import { Percent, PositiveOrMinus1 } from "./numbers.js";
import { recommendedHHFFor } from "./recommendedHHF.js";
import { classifierNumbers } from "./classifiersData.js";
import { getDivShortToRuns } from "./classifiersSource.js";
import { calculateUSPSAClassification } from "../../../shared/utils/classification.js";
import { lazy } from "../utils.js";

export const getDivShortToShooterToRuns = lazy(() => {
  const divShortToRuns = getDivShortToRuns();
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
}, "../../cache/divShortToShooterToRuns.json");

export const getRecHHFMap = lazy(() => {
  const result = mapDivisions(() => ({}));
  mapDivisionsFlat((division) =>
    classifierNumbers.map((number) => {
      result[division][number] = recommendedHHFFor({
        division,
        number,
      });
    })
  );
  return result;
}, "../../cache/recHHFMap.json");

export const getShooterToRuns = lazy(() => {
  const divShortToRuns = getDivShortToRuns();
  const scrumbled = [].concat(
    divShortToRuns.opn,
    divShortToRuns.ltd,
    divShortToRuns.l10,
    divShortToRuns.prod,
    divShortToRuns.ss,
    divShortToRuns.rev,
    divShortToRuns.co,
    divShortToRuns.lo,
    divShortToRuns.pcc,
    divShortToRuns.loco
  );

  const final = scrumbled.map((c) => {
    const { division, classifier: number } = c;
    if (c.hf) {
      const hhf = curHHFForDivisionClassifier({ division, number });
      c.recHHF = getRecHHFMap()[division]?.[number] || 0;
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
}, "../../cache/shooterToRuns.json");

const getShooterToXXXPercentClassificationsFactory = (field) =>
  lazy(
    () =>
      Object.fromEntries(
        Object.entries(getShooterToRuns()).map(([memberId, c]) => {
          return [memberId, calculateUSPSAClassification(c, field)];
        })
      ),
    `../../cache/shooterClassifications.by${field}.json`
  );

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
