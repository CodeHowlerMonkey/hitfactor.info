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

const scsaDivisionWithPrefix = (scsaDivision) => `scsa:${scsaDivision.toLowerCase()}`;

// See: https://scsa.org/classification
// Peak Times in SCSA typically change every 2 to 3 years, and new classifiers have not been added
// since the late 2000s.
const PeakTimesMap = {
  //      SC-101  SC-102 SC-103 SC-104 SC-105 SC-106 SC-107 SC-108
  'ISR' : [13.5,  12,    10.5,  15.75, 13,    14.25, 14,    11  ],
  'LTD' : [12.5,  9.5,   9.5,   13.5,  10.5,  12.5,  12.5,  9.5 ],
  'OSR' : [12.25, 10.5,  10,    14.25, 12.75, 13.5,  12.75, 10.5],
  'RFPI': [10.5,  9,     8,     13,    9.25,  11,    11,    8.25],
  'RFPO': [8.75,	7.5,	 7,	    11.5,	 8.5,	  9.5,	 10,	  7.5 ],
  'RFRI': [9.75,	7.5,	 7.5,	  12,	   9,	    9.75,	 10,	  7.5 ],
  'RFRO': [9.5,	  7,	   7,	    10.75, 8.5,	  9,	   9,	    7   ],
  'PROD': [13,    10,    10,    14,    11.5,  13,    13,    10  ],
  'OPN' : [11.25,	9.5,	 8.5,	  12.5,	 10.5,	11.25, 11.5,	8.5 ],
  'SS'  : [13.25, 10.5,  10.25, 14.75, 11.75, 13.5,  13.5,  10.5],
  'CO'  : [12.5,  9.75,  10,    13.75, 11,    12.75, 13,    9.75],
  'PCCO': [9.5,	  7,	   7,	    11.25, 8.75,	9,	   9.5,	  7.5 ],
  'PCCI': [10.75,	8.5,	7.75,   12.25, 9.5,   10.5,  11,    8   ]
}

const scsaPeakTime = (scsaDivision, scsaClassifierCode) => {
  // Indexing scheme based on the fact that the division peak times in the above structure are sorted in ascending order.
  return PeakTimesMap[scsaDivision][parseInt(scsaClassifierCode.substr(3, 4))-101];
}

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

const scsaMatchInfo = async (uuid, matchInfo) => {
  // Unlike USPSA, SCSA does not have results.json.
  const [match, scoresJson] = await Promise.all([
    fetchPS(`${uuid}/match_def.json`),
    fetchPS(`${uuid}/match_scores.json`),
  ]);
  if (!match || !scoresJson) {
    return [];
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
  const shootersDivisionMap = Object.fromEntries(match_shooters.map((s) => [s.sh_uuid, s.sh_dvp]));
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
      return classifiersMap[stage_uuid] !== undefined && classifierCode.match(/SC-10[0-8]/g);
    })
    .map((ms) => {
      const { stage_uuid, stage_stagescores } = ms;
      const classifier = classifiersMap[stage_uuid];

      return stage_stagescores.filter((ss) => {
        const divisionCode = shootersDivisionMap[ss.shtr]?.toUpperCase();
        return divisionCode !== undefined && Object.keys(PeakTimesMap).find((div) => div === divisionCode) !== undefined;
      }).map((ss) => {
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
        const penaltyCount = pens.flat().reduce((p, c) => p + c , 0)
        const detailedScores = stageScoresMap[stage_uuid]?.[ss.shtr] || {};

        const adjustedStrings = strings.map((s, idx) => {
          const penCountsForString = pens[idx];
          // Multiply the count of each penalties by their value, and sum the result.
          const totalStringPenalties = penCountsForString.reduce((p, c, idx) => p + (c * match_penalties[idx].pen_val), 0);
          const adjustedStringTotal = s + totalStringPenalties;
          // Strings max out at 30 seconds in SCSA.
          return Math.min(30, adjustedStringTotal);
        })
          .sort(((x, y) => y - x));

        const memberNumber = shootersMap[ss.shtr]?.toUpperCase();
        const divisionCode = shootersDivisionMap[ss.shtr]?.toUpperCase();
        const division = scsaDivisionWithPrefix(divisionCode);

        const modifiedDate = new Date(detailedScores.mod);
        const modified = Number.isNaN(modifiedDate.getTime()) ? undefined : modifiedDate;

        // Worst string (front of the array) dropped.
        const bestNStrings = adjustedStrings.slice(1);

        const stageTotal = bestNStrings.reduce((p, c) => p + c, 0);

        const classifierPeakTime = scsaPeakTime(divisionCode, classifier);
        return {
          hf: stageTotal,
          hhf: classifierPeakTime,

          points: 0,
          penalties: penaltyCount,
          stageTimeSecs: stageTotal,

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

          percent: Number(classifierPeakTime / stageTotal).toFixed(2),
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

  return { scores, match, results: [] };
}

const uspsaOrHitFactorMatchInfo = async (uuid, matchInfo) => {
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

const NilMatchResults = { scores: [], matches: [], results: [] };

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
    uuids.map((uuid) => {
      const match = matches.find((m) => m.uuid === uuid);
      if (['USPSA', 'Hit_Factor'].find((x) => x === match.templateName)) {
        return uspsaOrHitFactorMatchInfo(
          uuid,
          match
        );
      } else if ('Steel Challenge' === match.templateName) {
        return scsaMatchInfo(
          uuid,
          match
        );
      } else {
        return NilMatchResults;
      }
    }
    )
  );
  return matchResults.reduce(
    (acc, cur) => {
      acc.scores = acc.scores.concat(cur.scores);
      acc.matches = acc.matches.concat(cur.match);
      acc.results = acc.results.concat(cur.results);
      return acc;
    },
    NilMatchResults
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

const matchesForUploadFilter = () => ({ $expr: { $gt: ["$updated", "$uploaded"] } });
const findAFewMatches = async () =>
  Matches.find(matchesForUploadFilter()).limit(5).sort({ updated: 1 });

const uploadLoop = async () => {
  const count = await Matches.countDocuments(matchesForUploadFilter());
  console.log(count + " uploads in the queue");

  let numberOfUpdates = 0;
  let fewMatches = [];
  do {
    fewMatches = await findAFewMatches();
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
