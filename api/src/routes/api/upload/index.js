import FormData from "form-data";
import { ZenRows } from "zenrows";
import uniqBy from "lodash.uniqby";
import { UTCDate } from "../../../../../shared/utils/date.js";
import { uuidsFromUrlString } from "../../../../../shared/utils/uuid.js";
import { curHHFForDivisionClassifier } from "../../../dataUtil/hhf.js";
import { HF, Percent } from "../../../dataUtil/numbers.js";
import { Score, scoresFromClassifierFile } from "../../../db/scores.js";
import { RecHHF, hydrateRecHHFsForClassifiers } from "../../../db/recHHF.js";
import { singleClassifierExtendedMetaDoc, Classifier } from "../../../db/classifiers.js";
import { hydrateStats } from "../../../db/stats.js";
import {
  scoresForRecommendedClassification,
  reclassifyShooters,
  shooterObjectsFromClassificationFile,
  Shooter,
} from "../../../db/shooters.js";
import { DQs } from "../../../db/dq.js";
import { calculateUSPSAClassification } from "../../../../../shared/utils/classification.js";

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const retryDelay = (retry) => {
  const quickRandom = Math.ceil(32 + 40 * Math.random());
  return delay(retry * 312 + quickRandom);
};

const fetchUSPSAEndpoint = async (sessionKey, endpoint, tryNumber = 1, maxTries = 3) => {
  try {
    const client = new ZenRows(process.env.ZENROWS_API_KEY);
    // const response = await fetch(
    const { data } = await client.get(
      `https://api.uspsa.org/api/app/${endpoint}`,
      { custom_headers: true },
      {
        headers: {
          accept: "application/json",
          "uspsa-api": sessionKey,
          "Uspsa-Api-Version": "1.1.3",
          "Uspsa-Debug": "FALSE",
          "user-agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
          Accept: "application/json",
        },
      }
    );
    return data;
    // return await response.json();
  } catch (err) {
    if (tryNumber <= maxTries) {
      await retryDelay(tryNumber);
      return await fetchUSPSAEndpoint(sessionKey, endpoint, tryNumber + 1, maxTries);
    }

    return null;
  }
};

const loginToUSPSA = async (username, password) => {
  try {
    const client = new ZenRows(process.env.ZENROWS_API_KEY);
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    //const response = await fetch("https://api.uspsa.org/api/app/login", {
    const { data } = await client.post(
      "https://api.uspsa.org/api/app/login",
      { custom_headers: true },
      {
        headers: {
          "uspsa-api-version": "1.1.3",
          "uspsa-debug": "FALSE",
          "user-agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
          ...formData.getHeaders(),
        },
        data: formData,
      }
    );
    //return await response.json();
    return data;
  } catch (err) {
    console.error("loginToUSPSA error");
    console.error(err);
  }
  return null;
};

const classifiersAndShootersFromScores = (scores) => {
  const classifiers = uniqBy(
    scores.map(({ classifierDivision, classifier, division }) => ({
      classifierDivision,
      classifier,
      division,
    })),
    (s) => s.classifierDivision
  ).filter((c) => !!c.classifier);
  const shooters = uniqBy(
    scores.map(({ memberNumberDivision, memberNumber, division }) => ({
      memberNumberDivision,
      memberNumber,
      division,
    })),
    (s) => s.memberNumberDivision
  ).filter((c) => !!c.memberNumber);
  return { classifiers, shooters };
};

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
  // TODO: upload shooter from USPSA with memberNumber/password

  fastify.get("/test/:memberNumber", async (req, res) => {
    const { memberNumber } = req.params;
    const scores = await scoresForRecommendedClassification([memberNumber]);
    return calculateUSPSAClassification(scores, "recPercent");
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
                  "hitsPerPage=10&query=" +
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

  fastify.post("/uspsa", async (req, res) => {
    const { memberNumber, password } = req.body;

    const loginResult = await loginToUSPSA(memberNumber, password);
    if (!loginResult) {
      return {
        error: "Can't login to USPSA",
      };
    }
    if (!loginResult?.success) {
      return {
        error: loginResult?.message || loginResult,
      };
    }

    const { session_key, member_number } = loginResult?.member_data || {};
    if (!session_key || !member_number) {
      return { error: "Unexpected Login Response" };
    }
    const [uspsaClassifiers, uspsaClassification] = await Promise.all([
      fetchUSPSAEndpoint(session_key, `classifiers/${member_number}`),
      fetchUSPSAEndpoint(session_key, `classification/${member_number}`),
    ]);
    if (!uspsaClassifiers && !uspsaClassification) {
      return { error: "Can't fetch data from USPSA" };
    }

    try {
      const scores = scoresFromClassifierFile({ value: uspsaClassifiers });
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
      const shooterObjs = await shooterObjectsFromClassificationFile(uspsaClassification);
      await Shooter.bulkWrite(
        shooterObjs
          .filter((s) => !!s.memberNumber)
          .map((s) => ({
            updateOne: {
              filter: {
                memberNumber: s.memberNumber,
                division: s.division,
              },
              update: { $set: s },
              upsert: true,
            },
          }))
      );

      const { classifiers, shooters } = classifiersAndShootersFromScores(scores);
      afterUpload(classifiers, shooters);

      return {
        result: {
          classifiers,
          shooters,
        },
      };
    } catch (e) {
      console.error(e);
      return { error: "Can't parse USPSA data" };
    }
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
            update: { $setOnInsert: s },
            upsert: true,
          },
        }))
      );

      const { classifiers, shooters } = classifiersAndShootersFromScores(scores);
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
