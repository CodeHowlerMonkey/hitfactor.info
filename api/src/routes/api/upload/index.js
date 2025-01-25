import algoliasearch from "algoliasearch";
import uniqBy from "lodash.uniqby";
import { v4 as randomUUID } from "uuid";

import { calculateUSPSAClassification } from "../../../../../shared/utils/classification";
import { Matches } from "../../../db/matches";
import { RecHHFs } from "../../../db/recHHF";
import {
  scoresForRecommendedClassification,
  allDivisionsScores,
} from "../../../db/shooters";
import {
  uploadMatchesFromUUIDs,
  uspsaOrHitFactorMatchInfo,
} from "../../../worker/uploads";

const searchMatches = async q => {
  try {
    const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
    const index = client.initIndex("postmatches");
    const { hits } = await index.search(q, {
      hitsPerPage: 25,
      filters:
        "templateName:USPSA OR templateName:'Hit Factor' OR templateName:'Steel Challenge'",
    });

    return hits
      .map(h => ({
        matchDate: new Date(h.match_date),
        updated: new Date(h.updated),
        created: new Date(h.created),
        id: h.id,
        state: h.front_club_state,
        name: h.match_name,
        uuid: h.match_id,
      }))
      .sort((a, b) => b.id - a.id);
  } catch (err) {
    console.error(err);
  }
  return [];
};

/**
 * Replaces same day dupes with a single average run, same as
 * scoresForRecommendedClassification(), but in memory.
 *
 * Used for What If Recommended Classification calculation
 */
const dedupeGrandbagging = scores =>
  Object.values(
    scores.reduce((acc, cur) => {
      cur.classifier = cur.classifier || randomUUID;
      const date = new Date(cur.sd).toLocaleDateString();
      const key = [date, cur.classifier].join(":");
      acc[key] = acc[key] || [];
      acc[key].push(cur);
      return acc;
    }, {}),
  ).map(oneDayScores => {
    if (oneDayScores.length === 1) {
      return oneDayScores[0];
    }

    const avgHf =
      oneDayScores.reduce((acc, cur) => acc + cur.hf, 0) / oneDayScores.length;
    const avgRecPercent =
      oneDayScores.reduce((acc, cur) => acc + cur.recPercent, 0) / oneDayScores.length;

    return { ...oneDayScores[0], hf: avgHf, recPercent: avgRecPercent };
  });

const uploadRoutes = async fastify => {
  fastify.post("/whatif", async req => {
    const { scores, division, memberNumber } = req.body;
    const now = new Date();

    const lookupHHFs = uniqBy(
      scores
        .filter(s => s.hf && s.classifier && s.source !== "Major Match")
        .map(s => {
          if (s.classifier) {
            s.classifierDivision = [s.classifier, division].join(":");
          }
          return s;
        }),
      s => s.classifierDivision,
    ).map(s => s.classifierDivision);
    const recHHFs = await RecHHFs.find({
      classifierDivision: { $in: lookupHHFs },
    }).lean();
    const recHHFsMap = recHHFs.reduce((acc, cur) => {
      acc[cur.classifierDivision] = cur;
      return acc;
    }, {});

    // final score prep
    const hydratedScores = scores.map((c, index, all) => {
      c.division = division;
      if (!c.sd) {
        c.sd = new Date(now.getTime() + 1000 * (all.length - index)).toISOString();
      }
      if (c.classifier) {
        c.classifierDivision = [c.classifier, division].join(":");
      }

      const recHHF = recHHFsMap[c.classifierDivision];
      if (recHHF) {
        c.recPercent = (100 * c.hf) / recHHF.recHHF;
        c.curPercent = (100 * c.hf) / recHHF.curHHF;
      } else {
        console.error(`No RecHHF for ${c.classifierDivision}`);
      }
      return c;
    });
    const existingRecScores = await scoresForRecommendedClassification([memberNumber]);
    const existingScores = await allDivisionsScores([memberNumber]);
    const recScores = dedupeGrandbagging(hydratedScores);
    const otherDivisionsScores = existingScores.filter(s => s.division !== division);
    const recPercentClassification = calculateUSPSAClassification(
      recScores,
      "recPercent",
      now,
      "brutal+uncapped",
      8,
      4,
      6,
    );
    const curPercentClassification = calculateUSPSAClassification(
      [...hydratedScores, ...otherDivisionsScores],
      "curPercent",
      now,
      "uspsa",
      8,
      4,
      6,
    );

    return {
      scoresByDate: recScores.map(({ hf, classifier, recPercent, sd }) => ({
        hf,
        classifier,
        recPercent,
        sd,
      })),
      recHHFsMap,
      whatIf: {
        recPercent: recPercentClassification[division]?.percent,
        curPercent: curPercentClassification[division]?.percent,
      },
      scores: hydratedScores,
      existingRec: existingRecScores
        .filter(s => s.division === "co")
        .map(({ hf, classifier }) => ({ hf, classifier })),
      existing: existingScores
        .filter(s => s.division === "co")
        .map(({ hf, classifier }) => ({ hf, classifier })),
    };
  });

  fastify.get("/searchMatches", async req => {
    const { q } = req.query;
    const algoliaMatches = await searchMatches(q);
    const uuids = algoliaMatches.map(m => m.uuid);

    const foundMatches = await Matches.find({ uuid: { $in: uuids } });
    const foundMatchesByUUID = foundMatches.reduce((acc, curFoundMatch) => {
      acc[curFoundMatch.uuid] = curFoundMatch;
      return acc;
    }, {});

    return algoliaMatches.map(m => {
      const foundMatch = foundMatchesByUUID[m?.uuid] || {};
      m.uploaded = foundMatch.uploaded;
      m.type = foundMatch.type;
      m.subType = foundMatch.subType;
      m.templateName = foundMatch.templateName;

      if (foundMatch.uploaded) {
        m.eta = 0;
      } else if (foundMatch.updated) {
        m.eta = 5;
      } else {
        m.eta = 30;
      }

      return m;
    });
  });

  fastify.get("/info/:uuid", async req => {
    const { uuid } = req.params;
    return uspsaOrHitFactorMatchInfo(uuid, true);
  });

  fastify.post("/", async req => {
    const { uuids } = req.body;
    return uploadMatchesFromUUIDs(uuids);
  });
};

export default uploadRoutes;
