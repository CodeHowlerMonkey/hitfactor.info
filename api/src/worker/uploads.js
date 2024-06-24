import uniqBy from "lodash.uniqby";
import { connect } from "../db/index.js";
import { RecHHF, hydrateRecHHFsForClassifiers } from "../db/recHHF.js";
import { reclassifyShooters } from "../db/shooters.js";
import { hydrateStats } from "../db/stats.js";
import { Classifier, singleClassifierExtendedMetaDoc } from "../db/classifiers.js";
import { UTCDate } from "../../../shared/utils/date.js";
import { Score } from "../db/scores.js";
import { DQs } from "../db/dq.js";
import { uuidsFromUrlString } from "../../../shared/utils/uuid.js";
import { curHHFForDivisionClassifier } from "../dataUtil/hhf.js";
import { Percent } from "../dataUtil/numbers.js";
import {
  Matches,
  fetchAndSaveMoreUSPSAMatchesById,
  fetchAndSaveMoreUSPSAMatchesByUpdatedDate,
} from "../db/matches.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const classifiersAndShootersFromScores = (scores, memberNumberToNameMap) => {
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
      name: memberNumberToNameMap[memberNumber],
    })),
    (s) => s.memberNumberDivision
  ).filter((c) => !!c.memberNumber);
  return { classifiers, shooters };
};

export const afterUpload = async (classifiers, shooters, curTry = 1, maxTries = 3) => {
  try {
    console.time("afterUploadWorker");
    // recalc recHHF
    await hydrateRecHHFsForClassifiers(classifiers);
    console.timeLog("afterUploadWorker", "recHHFs");

    // recalc shooters
    await reclassifyShooters(shooters);
    console.timeLog("afterUploadWorker", "shooters");

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
    console.timeLog("afterUploadWorker", "classifiers");

    console.timeEnd("afterUploadWorker");
  } catch (err) {
    console.error("afterUploadWorker error:");
    console.error(err);
    if (curTry < maxTries) {
      console.error("retrying");
      return afterUpload(classifiers, shooters, curTry + 1, maxTries);
    }
  }
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
    li: "ltd",

    lt: "l10",
    limited10: "l10",
    lim10: "l10",
    ltdten: "l10",

    pr: "prod",
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

const matchInfo = async (uuid, matchInfo) => {
  const [match, results, scoresJson] = await Promise.all([
    fetchPS(`${uuid}/match_def.json`),
    fetchPS(`${uuid}/results.json`),
    fetchPS(`${uuid}/match_scores.json`),
  ]);
  if (!match || !results) {
    return [];
  }
  const { match_shooters, match_stages } = match;
  const shootersMap = Object.fromEntries(match_shooters.map((s) => [s.sh_uuid, s.sh_id]));
  match.memberNumberToNamesMap = Object.fromEntries(
    match_shooters.map((s) => [s.sh_id, [s.sh_fn, s.sh_ln].filter(Boolean).join(" ")])
  );
  const classifiersMap = Object.fromEntries(
    match_stages
      .filter((s) => !!s.stage_classifiercode)
      .map((s) => [s.stage_uuid, s.stage_classifiercode])
  );
  const classifierUUIDs = Object.keys(classifiersMap);
  const classifierResults = results.filter((r) => classifierUUIDs.includes(r.stageUUID));

  const { match_scores } = scoresJson;
  // [stageUUID][shooterUUID]= { ...scoresInfo}
  const stageScoresMap = match_scores.reduce((acc, cur) => {
    const curStage = acc[cur.stage_uuid] || {};
    cur.stage_stagescores.forEach((cs) => {
      curStage[cs.shtr] = cs;
    });
    acc[cur.stage_uuid] = curStage;
    return acc;
  }, {});

  const scores = classifierResults
    .map((r) => {
      const { stageUUID, ...varNameResult } = r;
      const classifier = classifiersMap[stageUUID];

      // my borther in Christ, this is nested AF!
      return Object.values(varNameResult)[0][0].Overall.map((a) => {
        const memberNumber = shootersMap[a.shooter]?.toUpperCase();
        const division = normalizeDivision(a.division);
        const hhf = curHHFForDivisionClassifier({
          division,
          number: classifier,
        });
        const hf = Number(a.hitFactor) || 0;
        const percent = Percent(hf, hhf) || 0;
        const points = Number(a.points) || 0;
        const penalties = Number(a.penalties) || 0;

        const detailedScores = stageScoresMap[stageUUID]?.[a.shooter] || {};
        const modifiedDate = new Date(detailedScores.mod);
        const modified = Number.isNaN(modifiedDate.getTime()) ? undefined : modifiedDate;

        return {
          hf: Number(a.hitFactor),
          hhf,

          points,
          penalties,
          stageTimeSecs: a.stageTimeSecs,

          // from algolia / matches collection
          type: matchInfo?.type,
          subType: matchInfo?.subType,
          templateName: matchInfo?.templateName,

          // from /match_scores.json
          modified,
          steelMikes: detailedScores.popm,
          steelHits: detailedScores.poph,
          steelNS: detailedScores.popns,
          steelNPM: detailedScores.popnpm,
          rawPoints: detailedScores.rawpts,
          strings: detailedScores.str,
          targetHits: detailedScores.ts,
          device: detailedScores.dname,

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

  const matches = await Matches.find({ uuid: { $in: uuids } })
    .limit(0)
    .lean();
  const matchResults = await Promise.all(
    uuids.map((uuid) =>
      matchInfo(
        uuid,
        matches.find((m) => m.uuid === uuid)
      )
    )
  );
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

export const uploadMatches = async (uuids) => {
  try {
    const { scores: scoresRaw, matches: matchesRaw } = await multimatchUploadResults(
      uuids
    );
    const scores = scoresRaw.filter(Boolean);
    const matches = matchesRaw.filter(Boolean);
    const shooterNameMap = matches.reduce((acc, cur) => {
      return {
        ...acc,
        ...cur.memberNumberToNamesMap,
      };
    }, {});

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
      return { classifiers: [], shooters: [] };
    }
    await Score.bulkWrite(
      scores.map((s) => ({
        updateOne: {
          filter: {
            memberNumberDivision: s.memberNumberDivision,
            classifierDivision: s.classifierDivision,
            hf: s.hf,
            sd: s.sd,
          },
          update: { $setOnInsert: s },
          upsert: true,
        },
      }))
    );

    const { classifiers, shooters } = classifiersAndShootersFromScores(
      scores,
      shooterNameMap
    );
    await afterUpload(classifiers, shooters);
    return {
      shooters,
      classifiers,
    };
  } catch (e) {
    console.error(e);
    return { error: `${e.name}: ${e.message}` };
  }
};

async function runEvery(what, ms) {
  while (true) {
    const start = Date.now();

    try {
      await what();
    } catch (error) {
      console.error("An error occurred:", error);
    }

    const elapsed = Date.now() - start;
    const waitTime = Math.max(ms - elapsed, 0);

    await delay(waitTime);
  }
}

const MINUTES = 60 * 1000;

export const uploadsStats = async () => {
  await connect();

  const count = await Matches.countDocuments({ uploaded: { $exists: false } });
  console.log(count);
};

export const dqNames = async () => {
  await connect();

  const dqs = await DQs.aggregate([
    {
      $match: {
        memberNumber: {
          $nin: [
            null,
            "NA",
            "PEN",
            "PENDING",
            "NONE",
            "Pending",
            "x",
            "xx",
            "xxx",
            "none",
            "NEW",
            "new",
            "N/A",
            "n/a",
            "None",
            "0",
            "00",
            "000",
            "0000",
            "XXX",
            "",
            "Na",
            "na",
            "00000",
            "XXXX",
            "PQ",
            "X",
            "9999",
            "PEND",
            "GUEST",
          ],
        },
      },
    },
    {
      $group: {
        _id: "$memberNumber",
        firstName: {
          $last: "$firstName",
        },
        lastName: {
          $last: "$lastName",
        },
        total: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        total: -1,
      },
    },
  ]);

  console.log(JSON.stringify(dqs, null, 2));
};

const matchesForUploadFilter = (lastUploadedMatchId) => {
  return {
    $expr: { $gt: ["$updated", "$uploaded"], $gt: ["$id", lastUploadedMatchId || 0] },
  };
};

const findAFewMatches = async (lastUploadedMatchId) =>
  Matches.find(matchesForUploadFilter(lastUploadedMatchId)).limit(5).sort({ fetched: 1 });

const uploadLoop = async () => {
  const lastUploadedMatch = await Matches.findOne({ uploaded: { $exists: true } }).sort({
    updated: -1,
  });
  const count = await Matches.countDocuments(
    matchesForUploadFilter(lastUploadedMatch?.id)
  );
  console.log(count + " uploads in the queue");

  let numberOfUpdates = 0;
  let fewMatches = [];
  do {
    fewMatches = await findAFewMatches(lastUploadedMatch?.id);
    if (!fewMatches.length) {
      return;
    }
    const uuids = fewMatches.map((m) => m.uuid);
    console.log(uuids);
    const uploadResults = await uploadMatches(uuids);
    numberOfUpdates += uploadResults.classifiers?.length || 0;
    console.log(JSON.stringify(uploadResults, null, 2));
    console.log("uploaded");

    await Matches.bulkWrite(
      fewMatches.map((m) => ({
        updateOne: {
          filter: { _id: m._id },
          update: { $set: { ...m.toObject(), uploaded: new Date() } },
        },
      }))
    );
    console.log("done");
  } while (fewMatches.length);
  return numberOfUpdates;
};

const uploadsWorkerMain = async () => {
  await connect();

  runEvery(async () => {
    console.log("starting to fetch");
    console.time("fetchLoop");
    const utcHours = new Date().getUTCHours();
    if (utcHours < 7 || utcHours > 15) {
      let numberOfNewMatches = await fetchAndSaveMoreUSPSAMatchesById();
      let numberOfUpdatedMatches = await fetchAndSaveMoreUSPSAMatchesByUpdatedDate();
      console.log("fetched " + numberOfNewMatches + " new matches");
      console.log("fetched " + numberOfUpdatedMatches + " updated matches");
    } else {
      console.log("sleeping");
    }
    console.timeEnd("fetchLoop");
  }, 30 * MINUTES);

  setTimeout(() => {
    runEvery(async () => {
      console.log("starting upload");
      console.time("uploadLoop");

      const uploadUpdates = await uploadLoop();
      if (uploadUpdates > 0) {
        // recalc stats after uploading all matches in the queue
        await hydrateStats();
      }

      console.timeEnd("uploadLoop");
    }, 3 * MINUTES);
  }, 3 * MINUTES);
};

export default uploadsWorkerMain;
