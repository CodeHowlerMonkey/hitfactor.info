// TODO: rename to scores
import { dirPath, loadJSON } from "../utils.js";
import { byMemberNumber } from "./byMemberNumber.js";
import fs from "fs";
import { divIdToShort, mapDivisions } from "./divisions.js";

export const divShortToRunsImported = mapDivisions(() => []);
console.log(divShortToRunsImported);

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
        const target = divShortToRunsImported[divShort];
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
divShortToRunsImported.loco = [
  ...divShortToRunsImported.co,
  ...divShortToRunsImported.lo,
];

export const divShortToRunsLegacy = {
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
export const divShortToRuns = divShortToRunsImported;

console.log(mapDivisions((div) => divShortToRunsLegacy[div].length));
console.log(mapDivisions((div) => divShortToRunsImported[div].length));
console.log("difference:");
console.log(
  mapDivisions(
    (div) =>
      divShortToRunsImported[div].length - divShortToRunsLegacy[div].length
  )
);

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
