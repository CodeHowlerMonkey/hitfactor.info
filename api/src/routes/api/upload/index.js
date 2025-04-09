import algoliasearch from "algoliasearch";
import uniqBy from "lodash.uniqby";

import { calculateUSPSAClassification } from "../../../../../shared/utils/classification";
import { Matches } from "../../../db/matches";
import { scoresForRecommendedClassification } from "../../../db/shooters";

const searchMatches = async q => {
  try {
    const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
    const index = client.initIndex("postmatches");
    const { hits } = await index.search(q, {
      hitsPerPage: 10,
      filters:
        //"templateName:USPSA OR templateName:'Hit Factor' OR templateName:'Steel Challenge'",
        "templateName:USPSA",
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
        templateName: h.templateName,
      }))
      .sort((a, b) => b.id - a.id);
  } catch (err) {
    console.error(err);
  }
  return [];
};

const uploadRoutes = async fastify => {
  fastify.get("/:uuid", async (req, res) => {
    const { uuid } = req.params;
    const m = await Matches.findOne({ uuid }).populate([
      { path: "matchScores", populate: { path: "shooter" } },
    ]);
    if (!m) {
      res.code(404);
      return { error: "Match Not Found" };
    }
    const result = m.toObject({ virtuals: true });

    // add historical reclassification
    const memberNumbers = uniqBy(
      result.matchScores.map(c => c.memberNumber),
      c => c,
    );
    const scores = await scoresForRecommendedClassification(memberNumbers);
    const scoresByMemberNumber = scores.reduce((acc, s) => {
      acc[s.memberNumber] ??= [];
      acc[s.memberNumber].push(s);
      return acc;
    }, {});

    result.matchScores = result.matchScores.map(c => {
      const reclass = calculateUSPSAClassification(
        scoresByMemberNumber[c.memberNumber],
        "recPercent",
        new Date(),
        "brutal",
        8,
        8,
        12,
        110,
      )[c.division];

      return {
        ...c,
        shooterRecPercentHistorical: reclass.percent,
        shooterRecPercentHistoricalAge: reclass.age,
      };
    });

    return {
      ...result,
      uuid,
    };
  });
  fastify.get("/searchMatches", async req => {
    const { q } = req.query;
    const algoliaMatches = await searchMatches(q);
    const uuids = algoliaMatches.map(m => m.uuid);

    const foundMatches = await Matches.find({ uuid: { $in: uuids } }).populate([
      "scoresCount",
      "matchScoresCount",
    ]);
    const foundMatchesByUUID = foundMatches.reduce((acc, curFoundMatch) => {
      acc[curFoundMatch.uuid] = curFoundMatch;
      return acc;
    }, {});

    return algoliaMatches.map(m => {
      const foundMatch = foundMatchesByUUID[m?.uuid] || {};
      m.hasMatchScores = foundMatch.hasMatchScores;
      m.scoresCount = foundMatch.scoresCount || 0;
      m.updated = foundMatch.updated || m.updated;
      m.uploaded = foundMatch.uploaded;
      m.type = foundMatch.type;
      m.subType = foundMatch.subType || m.subType;
      m.templateName = foundMatch.templateName || m.templateName;

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
};

export default uploadRoutes;
