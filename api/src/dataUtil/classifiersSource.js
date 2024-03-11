// TODO: rename to scores
import memoize from "memoize";
import { badLazy, flatPush, processImport } from "../utils.js";
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
        divObj.division_classifiers
          .filter(({ source }) => source !== "Legacy") // saves RAM, no point looking at old
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
  result.loco = [...result.co, ...result.lo];
  return result;
});

export const selectClassifierDivisionScores = memoize(
  async ({ number, division, includeNoHF }) => {
    return (await getDivShortToRuns())[division].filter((run) => {
      if (!run) {
        return false;
      }

      if (!includeNoHF && run.hf < 0) {
        return false;
      }

      return run.classifier === number;
    });
  },
  ([{ number, division, includeNoHF }]) =>
    number + "/" + division + "/" + (includeNoHF ? "1" : "0")
);
