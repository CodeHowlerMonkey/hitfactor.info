// TODO: rename to scores

import { byMemberNumber } from "./byMemberNumber.js";
import { mapDivisions, mapDivisionsFlat } from "./divisions.js";
import { curHHFForDivisionClassifier } from "./hhf.js";
import { Percent, PositiveOrMinus1 } from "./numbers.js";
import { recommendedHHFFor } from "./recommendedHHF.js";
import { classifierNumbers } from "./classifiersData.js";
import { getDivShortToRuns } from "./classifiersSource.js";
import { calculateUSPSAClassification } from "../../../shared/utils/classification.js";

let _divShortToShooterToRuns = null;
export const getDivShortToShooterToRuns = () => {
  const divShortToRuns = getDivShortToRuns();
  if (_divShortToShooterToRuns) {
    return _divShortToShooterToRuns;
  }
  _divShortToShooterToRuns = {
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
  return _divShortToShooterToRuns;
};

let _recHHFMap = null;
export const getRecHHFMap = () => {
  if (_recHHFMap) {
    return _recHHFMap;
  }
  _recHHFMap = mapDivisions(() => ({}));
  mapDivisionsFlat((division) =>
    classifierNumbers.map((number) => {
      _recHHFMap[division][number] = recommendedHHFFor({
        division,
        number,
      });
    })
  );
};

let _shooterToRuns = null;
export const getShooterToRuns = () => {
  if (_shooterToRuns) {
    return _shooterToRuns;
  }
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

  _shooterToRuns = byMemberNumber(final);
  return _shooterToRuns;
};

const getShooterToXXXPercentClassificationsFactory = (field) => {
  let _result = null;

  return () => {
    if (_result) {
      return _result;
    }
    _result = Object.fromEntries(
      Object.entries(getShooterToRuns()).map(([memberId, c]) => {
        return [memberId, calculateUSPSAClassification(c, field)];
      })
    );
    return _result;
  };
};

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
