import uniqBy from "lodash.uniqby";
import { ZenRows } from "zenrows";
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
import { N, Percent } from "../dataUtil/numbers.js";
import {
  Matches,
  fetchAndSaveMoreMatchesById,
  fetchAndSaveMoreMatchesByUpdatedDate,
} from "../db/matches.js";
import {
  arrayWithExplodedDivisions,
  hfuDivisionCompatabilityMap,
  hfuDivisionsShortNames,
  pairToDivision,
} from "../dataUtil/divisions.js";

import {
  scsaDivisionWithPrefix,
  scsaPeakTime,
  ScsaPeakTimesMap,
} from "../dataUtil/classifiersData.js";
import { minorHF } from "../../../shared/utils/hitfactor.js";
import features from "../../../shared/features.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const uniqByTruthyMap = (arr, cb) => uniqBy(arr, cb).filter(cb).map(cb);
export const arrayCombination = (arr1, arr2, cb) => {
  const result = new Array(arr1.length * arr2.length);
  let i = 0;
  for (let ii = 0; ii < arr1.length; ++ii) {
    for (let iii = 0; iii < arr2.length; ++iii) {
      result[i++] = cb(arr1[ii], arr2[iii]);
    }
  }

  return result;
};

export const classifiersAndShootersFromScores = (
  scores,
  memberNumberToNameMap = {},
  includeHFUDivisions = false
) => {
  const divisionExplosionMap = includeHFUDivisions ? hfuDivisionCompatabilityMap : {};
  const uniqueClassifierDivisionPairs = uniqByTruthyMap(
    scores,
    (s) => s.classifierDivision
  );
  const uniqueMemberNumberDivisionPairs = uniqByTruthyMap(
    scores,
    (s) => s.memberNumberDivision
  );

  const classifiers = arrayWithExplodedDivisions(
    uniqueClassifierDivisionPairs,
    divisionExplosionMap,
    pairToDivision,
    (originalClassifierDivision, division) => {
      const classifier = originalClassifierDivision.split(":")[0];
      return {
        classifierDivision: [classifier, division].join(":"),
        classifier,
        division,
      };
    }
  );

  const shooters = arrayWithExplodedDivisions(
    uniqueMemberNumberDivisionPairs,
    divisionExplosionMap,
    pairToDivision,
    (originalMemberNumberDivision, division) => {
      const memberNumber = originalMemberNumberDivision.split(":")[0];
      return {
        memberNumberDivision: [memberNumber, division].join(":"),
        memberNumber,
        division,
        name: memberNumberToNameMap[memberNumber],
      };
    }
  );

  return {
    classifiers: uniqBy(classifiers, (c) => c.classifierDivision).filter(
      (c) => !!c.classifier
    ),
    shooters: uniqBy(shooters, (s) => s.memberNumberDivision).filter(
      (s) => !!s.memberNumber
    ),
  };
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
          upsert: true,
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

const _fetchPSWithZenRows = async (uuid, tryNumber = 1, maxTries = 2) => {
  try {
    const client = new ZenRows(process.env.ZENROWS_API_KEY);
    const { data, status } = await client.get(
      "https://practiscore.com/results/new/" + uuid,
      { js_render: "true", premium_proxy: "true" }
    );
    if (status !== 200) {
      console.error("fetchPSHTML error, bad status: " + status);
      throw new Error("tryHarder");
      return {};
    }
    return data;
  } catch (e) {
    if (tryNumber >= maxTries) {
      return {};
    }

    console.error(e);
    console.error("fetchPSHTML fetch error, retrying");
    return _fetchPSWithZenRows(uuid, tryNumber + 1);
  }
};

export const fetchPSHTML = async (uuid) => {
  const data = await _fetchPSWithZenRows(uuid);
  const dataStartIndex = data.indexOf("matchDef = {");
  if (dataStartIndex < 0) {
    console.error("fetchPSHTML error, cant find matchDef");
    return {};
  }

  try {
    return Object.fromEntries(
      data
        .substr(dataStartIndex)
        .split("\n")
        .filter((s) => s.includes("= "))
        .map((s) => {
          const [keyRaw, value] = s.split(" = ");
          const key = keyRaw.trim();
          if (["matchDef", "scores", "results"].includes(key)) {
            return [key, JSON.parse(value.trim().replace(/;$/, ""))];
          }
          return null;
        })
        .filter(Boolean)
    );
  } catch (e) {
    console.error("fetchPSHTML parse error");
    return {};
  }
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

const scsaMatchInfo = async (matchInfo) => {
  const { uuid } = matchInfo;

  // Unlike USPSA, SCSA does not have results.json.
  const { matchDef: match, scores: scoresJson } = await fetchPSHTML(matchInfo.uuid);
  if (!match || !scoresJson) {
    return EmptyMatchResultsFactory();
  }
  /*
    match_penalties Structure:
    [{
      "pen_warn": false,
      "pen_bin": false,
      "pen_name": "Procedural",
      "pen_val": 3
    }]
   */
  const { match_shooters, match_stages, match_penalties } = match;
  const shootersMap = Object.fromEntries(match_shooters.map((s) => [s.sh_uuid, s.sh_id]));
  const shootersDivisionMap = Object.fromEntries(
    match_shooters.map((s) => [s.sh_uuid, s.sh_dvp])
  );
  match.memberNumberToNamesMap = Object.fromEntries(
    match_shooters.map((s) => [s.sh_id, [s.sh_fn, s.sh_ln].filter(Boolean).join(" ")])
  );
  const classifiersMap = Object.fromEntries(
    match_stages
      .filter((s) => !!s.stage_classifiercode)
      .map((s) => [s.stage_uuid, s.stage_classifiercode])
  );

  const { match_scores } = scoresJson;
  const stageScoresMap = match_scores.reduce((acc, cur) => {
    const curStage = acc[cur.stage_uuid] || {};
    cur.stage_stagescores.forEach((cs) => {
      curStage[cs.shtr] = cs;
    });
    acc[cur.stage_uuid] = curStage;
    return acc;
  }, {});

  const scores = match_scores
    .filter((ms) => {
      const { stage_uuid } = ms;
      const classifierCode = classifiersMap[stage_uuid];
      return (
        classifiersMap[stage_uuid] !== undefined && classifierCode.match(/SC-10[0-8]/g)
      );
    })
    .map((ms) => {
      const { stage_uuid, stage_stagescores } = ms;
      const classifier = classifiersMap[stage_uuid];

      return stage_stagescores
        .filter((ss) => {
          const divisionCode = shootersDivisionMap[ss.shtr]?.toUpperCase();
          return (
            divisionCode !== undefined &&
            Object.keys(ScsaPeakTimesMap).find((div) => div === divisionCode) !==
              undefined
          );
        })
        .map((ss) => {
          // str is the array of all strings for the stage
          // e.g. [7, 5.46, 6.17, 23.13]
          const strings = ss.str;

          // penss is a two-dimensional array of the COUNT of all penalties, by index, on the stage.
          // e.g.
          //[
          //  [
          //    1,
          //    0,
          //    0,
          //    0
          //  ]
          const pens = ss.penss;
          const penaltyCount = pens.flat().reduce((p, c) => p + c, 0);
          const detailedScores = stageScoresMap[stage_uuid]?.[ss.shtr] || {};

          const adjustedStrings = strings
            .map((s, idx) => {
              const penCountsForString = pens[idx];
              // Multiply the count of each penalties by their value, and sum the result.
              const totalStringPenalties = penCountsForString.reduce(
                (p, c, idx) => p + c * match_penalties[idx].pen_val,
                0
              );
              const adjustedStringTotal = s + totalStringPenalties;
              // Strings max out at 30 seconds in SCSA.
              return Math.min(30, adjustedStringTotal);
            })
            .sort((a, b) => b - a);

          const memberNumber = shootersMap[ss.shtr]?.toUpperCase();
          const divisionCode = shootersDivisionMap[ss.shtr]?.toUpperCase();
          const division = scsaDivisionWithPrefix(divisionCode);

          const modifiedDate = new Date(detailedScores.mod);
          const modified = Number.isNaN(modifiedDate.getTime())
            ? undefined
            : modifiedDate;

          // Worst string (front of the array) dropped.
          const bestNStrings = adjustedStrings.slice(1);

          const stageTotal = N(bestNStrings.reduce((p, c) => p + c, 0));

          const classifierPeakTime = scsaPeakTime(divisionCode, classifier);
          return {
            stageTimeSecs: stageTotal,
            stagePeakTimeSecs: classifierPeakTime,

            penalties: penaltyCount,

            // from algolia / matches collection
            type: matchInfo?.type,
            subType: matchInfo?.subType,
            templateName: matchInfo?.templateName,

            // from /match_scores.json
            modified,
            strings: detailedScores.str,
            targetHits: detailedScores.ts,
            device: detailedScores.dname,

            percent: Percent(classifierPeakTime, stageTotal),
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
        r.stageTimeSecs > 0 &&
        !!r.memberNumber &&
        !!r.classifier &&
        !!r.division &&
        !!r.memberNumberDivision
    );

  return { scores, match, results: [] };
};

const uspsaOrHitFactorMatchInfo = async (matchInfo) => {
  const { uuid } = matchInfo;
  const { matchDef: match, results, scores: scoresJson } = await fetchPSHTML(uuid);
  if (!match || !results) {
    return EmptyMatchResultsFactory();
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

        const curScore = {
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
        curScore.minorHF = minorHF(curScore);
        return curScore;
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

const EmptyMatchResultsFactory = () => ({ scores: [], matches: [], results: [] });

const uploadResultsForMatches = async (matches) => {
  const matchResults = [];
  for (const match of matches) {
    console.log("pulling " + match.uuid);
    switch (match.templateName) {
      case "Steel Challenge": {
        // Steel Challenge doesn't have new results format with embedded json files
        // skipping it entirely for now
        break;
        const scsaResults = await scsaMatchInfo(match);
        matchResults.push(scsaResults);
        break;
      }

      case "USPSA":
      case "Hit Factor":
      default: {
        const uspsaResults = await uspsaOrHitFactorMatchInfo(match);
        matchResults.push(uspsaResults);
        break;
      }
    }
  }

  return matchResults.reduce((acc, cur) => {
    acc.scores = acc.scores.concat(cur.scores);
    acc.matches = acc.matches.concat(cur.match);
    acc.results = acc.results.concat(cur.results);
    return acc;
  }, EmptyMatchResultsFactory());
};

const uploadResultsForMatchUUIDs = async (uuidsRaw) => {
  const uuids = uuidsRaw.filter(
    (maybeUUID) => uuidsFromUrlString(maybeUUID)?.length === 1
  );
  if (!uuids?.length) {
    return [];
  }

  const matches = await Matches.find({ uuid: { $in: uuids } })
    .limit(0)
    .lean();

  return uploadResultsForMatches(matches);
};

const processUploadResults = async (uploadResults) => {
  try {
    const { scores: scoresRaw, matches: matchesRaw } = uploadResults;
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
      shooterNameMap,
      true
    );
    await afterUpload(classifiers, shooters);

    const publicShooters = features.hfu
      ? shooters
      : shooters.filter((s) => !hfuDivisionsShortNames.includes(s.division));
    const publicClassifiers = features.hfu
      ? classifiers
      : classifiers.filter((c) => !hfuDivisionsShortNames.includes(c.division));

    return {
      shooters: publicShooters,
      classifiers: publicClassifiers,
    };
  } catch (e) {
    console.error(e);
    return { error: `${e.name}: ${e.message}` };
  }
};

export const uploadMatches = async (matches) => {
  return await processUploadResults(await uploadResultsForMatches(matches));
};

export const uploadMatchesFromUUIDs = async (uuids) => {
  return await processUploadResults(await uploadResultsForMatchUUIDs(uuids));
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

const matchesForUploadFilter = (extraFilter = {}) => ({
  ...extraFilter,
  $expr: { $gt: ["$updated", "$uploaded"] },
});
const findAFewMatches = async (extraFilter) =>
  Matches.find(matchesForUploadFilter(extraFilter)).limit(15).sort({ updated: 1 });

const uploadLoop = async () => {
  // TODO: add Steel Challenge here once supported
  const onlyUSPSAOrHF = { templateName: { $in: ["USPSA", "Hit Factor"] } };
  /*
  const count = await Matches.countDocuments(matchesForUploadFilter(onlyUSPSAOrHF));
  console.log(count + " uploads in the queue (USPSA or Hit Factor only)");
  */

  let numberOfUpdates = 0;
  let fewMatches = [];
  do {
    fewMatches = await findAFewMatches(onlyUSPSAOrHF);
    if (!fewMatches.length) {
      return numberOfUpdates;
    }
    const uuids = fewMatches.map((m) => m.uuid);
    console.log(uuids);
    const uploadResults = await uploadMatches(fewMatches);
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
    try {
      const utcHours = new Date().getUTCHours();
      if (utcHours < 7 || utcHours > 15) {
        let numberOfNewMatches = await fetchAndSaveMoreMatchesById();
        let numberOfUpdatedMatches = await fetchAndSaveMoreMatchesByUpdatedDate();
        console.log("fetched " + numberOfNewMatches + " new matches");
        console.log("fetched " + numberOfUpdatedMatches + " updated matches");
      } else {
        console.log("sleeping");
      }
    } catch(e) {
      console.error('fetchLoop error:')
      console.error(e)
      await connect()
    } finally {
      console.timeEnd("fetchLoop");
    }
  }, 30 * MINUTES);

  setTimeout(() => {
    runEvery(async () => {
      console.log("starting upload");
      console.time("uploadLoop");

      try {
        const uploadUpdates = await uploadLoop();
        if (uploadUpdates > 0) {
          // recalc stats after uploading all matches in the queue
          await hydrateStats();
        }
      } catch(e) {
        console.error('uploadLoop error:')
        console.error(e)

        await connect()
      }
      finally {
        console.timeEnd("uploadLoop");
      }
    }, 15 * MINUTES);
  }, 5 * MINUTES);
};

export default uploadsWorkerMain;
