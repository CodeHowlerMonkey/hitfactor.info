import { curHHFForDivisionClassifier } from "../../../dataUtil/hhf.js";
import { HF, Percent } from "../../../dataUtil/numbers.js";

const fetchPS = async (path) =>
  (
    await fetch("https://s3.amazonaws.com/ps-scores/production/" + path, {
      referrer: "https://practiscore.com",
    })
  ).json();

const normalizeDivision = (shitShowDivisionNameCanBeAnythingWTFPS) => {
  const lowercaseNoSpace = shitShowDivisionNameCanBeAnythingWTFPS
    .toLowerCase()
    .replace(/\s/g, "");
  const anythingMap = {
    open: "opn",

    limited: "ltd",
    lim: "ltd",

    limited10: "l10",
    lim10: "l10",

    production: "prod",

    revolver: "rev",
    revol: "rev",

    singlestack: "ss",

    carryoptics: "co",
    carryoptic: "co",

    limitedoptics: "lo",
    limitedoptic: "lo",

    pistolcalibercarbine: "pcc",
    carbine: "pcc",
  };

  return anythingMap[lowercaseNoSpace] || lowercaseNoSpace;
};

const uploadRoutes = async (fastify, opts) => {
  fastify.get("/:uuid", async (req, res) => {
    const { uuid } = req.params;
    try {
      const [match, results] = await Promise.all([
        fetchPS(`${uuid}/match_def.json`),
        fetchPS(`${uuid}/results.json`),
      ]);
      const { match_shooters, match_stages } = match;
      const shootersMap = Object.fromEntries(
        match_shooters.map((s) => [s.sh_uuid, s.sh_id])
      );
      const classifiersMap = Object.fromEntries(
        match_stages
          .filter((s) => !!s.stage_classifiercode)
          .map((s) => [s.stage_uuid, s.stage_classifiercode])
      );
      const classifierUUIDs = Object.keys(classifiersMap);
      //return classifierUUIDs

      const classifierResults = results.filter((r) =>
        classifierUUIDs.includes(r.stageUUID)
      );

      // TODO: coolect classifier codes and fetch once all recHHFs for them, then lookup and insert instead of 0s

      return classifierResults
        .map((r) => {
          const { stageUUID, ...varNameResult } = r;
          const classifier = classifiersMap[stageUUID];

          // my borther in Christ, this is nested AF!
          return Object.values(varNameResult)[0][0].Overall.map((a) => {
            const memberNumber = shootersMap[a.shooter];
            const division = normalizeDivision(a.division);
            const hhf = curHHFForDivisionClassifier({
              division,
              number: classifier,
            });
            const hf = Number(a.hitFactor);
            const percent = Percent(hf, hhf);

            return {
              hf: Number(a.hitFactor),
              memberNumber,
              classifier,
              upload: uuid,
              division,
              clubid: match.match_clubcode,
              club_name: match.match_clubname,
              sd: new Date(match.match_date),
              percent,
              code: "upload",
              source: "Stage Score",
              memberNumberDivision: [memberNumber, division].join(":"),
              hhf,
              curHHF: hhf,
              recHHF: 0,
              rec1HHF: 0,
              rec5HHF: 0,
              rec15HHF: 0,
            };
          });
        })
        .flat()
        .filter((r) => r.hf > 0 && !!r.memberNumber);
    } catch (e) {
      console.error(e);
      return { error: e };
    }
  });
};

export default uploadRoutes;
