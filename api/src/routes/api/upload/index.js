import uniqBy from "lodash.uniqby";
import { UTCDate } from "../../../../../shared/utils/date.js";
import { curHHFForDivisionClassifier } from "../../../dataUtil/hhf.js";
import { HF, Percent } from "../../../dataUtil/numbers.js";
import { Score } from "../../../db/scores.js";
import { hydrateSingleRecHFF } from "../../../db/recHHF.js";
import { hydrateSingleClassiferExtendedMeta } from "../../../db/classifiers.js";
import { hydrateStats } from "../../../db/stats.js";
import { reclassifySingleShooter } from "../../../db/shooters.js";

const fetchPS = async (path) =>
  (
    await fetch("https://s3.amazonaws.com/ps-scores/production/" + path, {
      referrer: "https://practiscore.com",
    })
  ).json();

const normalizeDivision = (shitShowDivisionNameCanBeAnythingWTFPS) => {
  const lowercaseNoSpace = shitShowDivisionNameCanBeAnythingWTFPS.toLowerCase().replace(/\s/g, "");
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

const uuidFromUrlString = (str) =>
  str.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12})/i)?.[0];

const scoresForUpload = async (uuid) => {
  const [match, results] = await Promise.all([
    fetchPS(`${uuid}/match_def.json`),
    fetchPS(`${uuid}/results.json`),
  ]);
  const { match_shooters, match_stages } = match;
  const shootersMap = Object.fromEntries(match_shooters.map((s) => [s.sh_uuid, s.sh_id]));
  const classifiersMap = Object.fromEntries(
    match_stages
      .filter((s) => !!s.stage_classifiercode)
      .map((s) => [s.stage_uuid, s.stage_classifiercode])
  );
  const classifierUUIDs = Object.keys(classifiersMap);
  const classifierResults = results.filter((r) => classifierUUIDs.includes(r.stageUUID));

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
          hhf,
          percent,
          memberNumber,
          classifier,
          division,
          upload: uuid,
          clubid: match.match_clubcode,
          club_name: match.match_clubname,
          sd: UTCDate(match.match_date),
          code: "N",
          source: "Stage Score",
          memberNumberDivision: [memberNumber, division].join(":"),
          classifierDivision: [classifier, division].join(":"),
        };
      });
    })
    .flat()
    .filter((r) => r.hf > 0 && !!r.memberNumber && !!r.classifier && !!r.division);
};

const postScoreUpload = async (classifiers, shooters) => {
  console.time("postScoreUpload");
  // recalc recHHF
  for (const { classifier, division } of classifiers) {
    await hydrateSingleRecHFF(division, classifier);
  }
  console.timeLog("postScoreUpload", "recHHFs");

  // recalc shooters
  for (const { memberNumber, division } of shooters) {
    await reclassifySingleShooter(memberNumber, division);
  }
  console.timeLog("postScoreUpload", "shooters");

  // recalc classifier meta
  for (const { classifier, division } of classifiers) {
    await hydrateSingleClassiferExtendedMeta(division, classifier);
  }
  console.timeLog("postScoreUpload", "classifiers");

  // recalc all stats without waiting
  await hydrateStats();
  console.timeEnd("postScoreUpload");
};

const uploadRoutes = async (fastify, opts) => {
  fastify.get("/:uuid", async (req, res) => {
    try {
      const { uuid } = req.params;
      const scores = await scoresForUpload(uuid);
      await Score.bulkWrite(
        scores.map((s) => ({
          updateOne: {
            filter: {
              memberNumberDivision: s.memberNumberDivision,
              classifierDivision: s.classifierDivision,
              hf: s.hf,
              sd: s.sd,
              clubid: s.clubid,
            },
            update: { $set: s },
            upsert: true,
          },
        }))
      );

      const classifiers = uniqBy(
        scores.map(({ classifierDivision, classifier, division }) => ({
          classifierDivision,
          classifier,
          division,
        })),
        (s) => s.classifierDivision
      );
      const shooters = uniqBy(
        scores.map(({ memberNumberDivision, memberNumber, division }) => ({
          memberNumberDivision,
          memberNumber,
          division,
        })),
        (s) => s.memberNumberDivision
      );

      postScoreUpload(classifiers, shooters);

      return {
        shooters,
        classifiers,
      };
    } catch (e) {
      console.error(e);
      return { error: e };
    }
  });
};

export default uploadRoutes;
