import { Score } from "../db/scores.js";
import { processImport, lazy } from "../utils.js";
import { divIdToShort, mapDivisions } from "./divisions.js";

const classifierScoreId = (memberId, obj) => {
  return [memberId, obj.classifier, obj.sd, obj.clubid, obj.hf].join("=");
};

const badScoresMap = {
  "125282=23-01=2/18/24=CCS08=15.9574": "CCB-shooter-158-percent",
};

export const getDivShortToRuns = lazy(() => {
  const _divShortToRuns = mapDivisions(() => []);
  processImport("../../data/imported", /classifiers\.\d+\.json/, (obj) => {
    const memberNumber = obj?.value?.member_data?.member_number;
    const memberId = obj?.value?.member_data?.member_id;
    const classifiers = obj?.value?.classifiers;
    classifiers.forEach((divObj) => {
      const divShort = divIdToShort[divObj?.division_id];
      if (!divShort) {
        // new imports have some weird division numbers (1, 10, etc) no idea what that is
        // just skip for now
        return;
      }

      const curDiv = _divShortToRuns[divShort];
      _divShortToRuns[divShort] = curDiv.concat(
        divObj.division_classifiers
          .filter(({ source }) => source !== "Legacy") // saves RAM, no point looking at old
          .filter((obj) => !badScoresMap[classifierScoreId(memberId, obj)]) // ignore banned scores
          .map(
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
  _divShortToRuns.loco = [].concat(_divShortToRuns.co, _divShortToRuns.lo);
  return _divShortToRuns;
});

export const selectClassifierDivisionScores = async ({ number, division }) =>
  Score.find({ classifier: number, division }).limit(0);
