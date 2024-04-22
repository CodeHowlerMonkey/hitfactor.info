import uniqBy from "lodash.uniqby";
import { UTCDate } from "../../../../../shared/utils/date.js";
import { uuidsFromUrlString } from "../../../../../shared/utils/uuid.js";
import { curHHFForDivisionClassifier } from "../../../dataUtil/hhf.js";
import { HF, Percent } from "../../../dataUtil/numbers.js";
import { Score } from "../../../db/scores.js";
import { RecHHF, hydrateRecHHFsForClassifiers } from "../../../db/recHHF.js";
import { singleClassifierExtendedMetaDoc, Classifier } from "../../../db/classifiers.js";
import { hydrateStats } from "../../../db/stats.js";
import { reclassifyShooters, testBrutalClassification } from "../../../db/shooters.js";
import { DQs } from "../../../db/dq.js";

const fetchPS = async (path) => {
  const response = await fetch("https://s3.amazonaws.com/ps-scores/production/" + path, {
    referrer: "https://practiscore.com",
  });
  if (response.status !== 200) {
    return null;
  }
  return await response.json();
};

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

const matchInfo = async (uuid) => {
  const [match, results] = await Promise.all([
    fetchPS(`${uuid}/match_def.json`),
    fetchPS(`${uuid}/results.json`),
  ]);
  if (!match || !results) {
    return [];
  }
  const { match_shooters, match_stages } = match;
  const shootersMap = Object.fromEntries(match_shooters.map((s) => [s.sh_uuid, s.sh_id]));
  const classifiersMap = Object.fromEntries(
    match_stages
      .filter((s) => !!s.stage_classifiercode)
      .map((s) => [s.stage_uuid, s.stage_classifiercode])
  );
  const classifierUUIDs = Object.keys(classifiersMap);
  const classifierResults = results.filter((r) => classifierUUIDs.includes(r.stageUUID));

  const scores = classifierResults
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
        const percent = Percent(hf, hhf) || 0;

        return {
          hf: Number(a.hitFactor),
          hhf,
          percent,
          memberNumber,
          classifier,
          division,
          upload: uuid,
          clubid: match.match_clubcode,
          club_name: match.match_clubname || match.match_name,
          matchName: match.match_name,
          sd: UTCDate(match.match_date),
          code: "N",
          source: "Stage Score",
          memberNumberDivision: [memberNumber, division].join(":"),
          classifierDivision: [classifier, division].join(":"),
        };
      });
    })
    .flat()
    .filter(
      (r) =>
        r.hf > 0 &&
        !!r.memberNumber &&
        !!r.classifier &&
        !!r.division &&
        !!r.memberNumberDivision
    );

  return { scores, match, results };
};

const multimatchUploadResults = async (uuidsRaw) => {
  const uuids = uuidsRaw.filter(
    (maybeUUID) => uuidsFromUrlString(maybeUUID)?.length === 1
  );
  if (!uuids?.length) {
    return [];
  }

  const matchResults = await Promise.all(uuids.map((uuid) => matchInfo(uuid, true)));
  return matchResults.reduce(
    (acc, cur) => {
      acc.scores = acc.scores.concat(cur.scores);
      acc.matches = acc.matches.concat(cur.match);
      acc.results = acc.results.concat(cur.results);
      return acc;
    },
    { scores: [], matches: [], results: [] }
  );
};

const afterUpload = async (classifiers, shooters) => {
  try {
    console.time("afterUpload");
    // recalc recHHF
    await hydrateRecHHFsForClassifiers(classifiers);
    console.timeLog("afterUpload", "recHHFs");

    // recalc shooters
    await reclassifyShooters(shooters);
    console.timeLog("afterUpload", "shooters");

    // recalc classifier meta
    const recHHFs = await RecHHF.find({
      classifierDivision: {
        $in: classifiers.map((c) => [c.classifer, c.division].join(":")),
      },
    })
      .select({ recHHF: true, _id: false, classifierDivision: true })
      .lean();
    const recHHFsByClassifierDivision = recHHFs.reduce((acc, cur) => {
      acc[cur.classifierDivision] = cur;
      return acc;
    }, {});
    const classifierDocs = await Promise.all(
      classifiers.map(({ classifier, division }) =>
        singleClassifierExtendedMetaDoc(
          division,
          classifier,
          recHHFsByClassifierDivision[[classifier, division].join(":")]
        )
      )
    );
    await Classifier.bulkWrite(
      classifierDocs.map((doc) => ({
        updateOne: {
          filter: { division: doc.division, classifier: doc.classifier },
          update: { $set: doc },
        },
      }))
    );
    console.timeLog("afterUpload", "classifiers");

    // recalc all stats without waiting
    await hydrateStats();
    console.timeEnd("afterUpload");
  } catch (err) {
    console.error("afterUpload error:");
    console.error(err);
  }
};

const uploadRoutes = async (fastify, opts) => {
  fastify.get("/test/:memberNumber", async (req, res) => {
    const { memberNumber } = req.params;
    return testBrutalClassification(memberNumber);
  });

  fastify.get("/searchMatches", async (req, res) => {
    const { q } = req.query;
    try {
      const {
        results: [{ hits }],
      } = await (
        await fetch(process.env.ALGOLIA_URL, {
          body: JSON.stringify({
            requests: [
              {
                indexName: "postmatches",
                params:
                  "hitsPerPage=5&query=" +
                  encodeURIComponent(q) +
                  "&facetFilters=templateName:USPSA", // I'm not installing qs for one API reee
              },
            ],
          }),
          method: "POST",
        })
      ).json();
      return hits.map((h) => ({
        date: new Date(h.match_date).toLocaleDateString(),
        state: h.front_club_state,
        name: h.match_name,
        uuid: h.match_id,
      }));
    } catch (err) {}
    return [];
  });

  fastify.get("/info/:uuid", async (req) => {
    const { uuid } = req.params;
    return matchInfo(uuid, true);
  });

  fastify.post("/", async (req, res) => {
    try {
      const { uuids } = req.body;
      const { scores: scoresRaw, matches: matchesRaw } = await multimatchUploadResults(
        uuids
      );
      const scores = scoresRaw.filter(Boolean);
      const matches = matchesRaw.filter(Boolean);

      try {
        const dqDocs = matches.reduce((acc, match) => {
          match.match_shooters.forEach((shooter) => {
            if (!shooter.sh_dq) {
              return;
            }

            acc.push({
              memberNumber: shooter.sh_id,
              lastName: shooter.sh_ln,
              firstName: shooter.sh_fn,
              division: shooter.sh_dvp,
              upload: match.match_id,
              clubId: match.match_clubcode,
              clubName: match.match_clubname || match.match_name,
              matchName: match.match_name,
              sd: UTCDate(match.match_date),
              dq: shooter.sh_dqrule,
            });
          });
          return acc;
        }, []);
        await DQs.bulkWrite(
          dqDocs.map((dq) => ({
            updateOne: {
              filter: {
                memberNumber: dq.memberNumber,
                division: dq.division,
                upload: dq.upload,
              },
              update: { $set: dq },
              upsert: true,
            },
          }))
        );
      } catch (e) {
        console.error("failed to save dqs");
        console.error(e);
      }

      if (!scores.length) {
        return { error: "No classifier scores found" };
      }
      await Score.bulkWrite(
        scores.map((s) => ({
          updateOne: {
            filter: {
              memberNumberDivision: s.memberNumberDivision,
              classifierDivision: s.classifierDivision,
              hf: s.hf,
              sd: s.sd,
              // some PS matches don't have club set, but all USPSA uploads do,
              // so to prevent dupes, don't filter by club on score upsert
              // clubid: s.clubid,
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

      afterUpload(classifiers, shooters);

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
