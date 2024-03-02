// TODO: rename to scores
import { dirPath, loadJSON } from "../utils.js";
import { byMemberNumber } from "./byMemberNumber.js";
import fs from "fs";
import { divIdToShort, mapDivisions } from "./divisions.js";

export const divShortToRuns = mapDivisions(() => []);

fs.readdirSync(dirPath("../../data/imported"))
  .filter((file) => !!file.match(/classifiers\.\d+\.json/))
  .forEach((file) => {
    const curJSON = loadJSON("../../data/imported/" + file);
    curJSON.forEach((obj) => {
      const memberNumber = obj?.value?.member_data?.member_number;
      const classifiers = obj?.value?.classifiers;
      classifiers.forEach((divObj) => {
        const divShort = divIdToShort[divObj?.division_id];
        if (!divShort) {
          // new imports have some weird division numbers (1, 10, etc) no idea what that is
          // just skip for now
          return;
        }
        const target = divShortToRuns[divShort];
        const extra = divObj?.division_classifiers?.map(
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
        );
        try {
          target.push.apply(target, extra); // aka flat push
        } catch (err) {
          console.log(divObj);
          console.log(divShort);
        }
      });
    });
  });
divShortToRuns.loco = [...divShortToRuns.co, ...divShortToRuns.lo];

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
