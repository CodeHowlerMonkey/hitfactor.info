/* eslint-disable no-console */

import { text } from "node:stream/consumers";
import { createGunzip } from "node:zlib";
import { Readable } from "stream";

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import uniqBy from "lodash.uniqby";
import { ObjectId } from "mongoose";

import features from "../../../shared/features";
import { UTCDate } from "../../../shared/utils/date";
import { minorHF } from "../../../shared/utils/hitfactor";
import { uuidsFromUrlString } from "../../../shared/utils/uuid";
import {
  normalizeClassifierCode,
  scsaDivisionWithPrefix,
  scsaPeakTime,
  ScsaPeakTimesMap,
} from "../dataUtil/classifiersData";
import {
  arrayWithExplodedDivisions,
  hfuDivisionCompatabilityMap,
  hfuDivisionsShortNames,
  pairToDivision,
} from "../dataUtil/divisions";
import { curHHFForDivisionClassifier } from "../dataUtil/hhf";
import { HF, N, Percent } from "../dataUtil/numbers";
import {
  AfterUploadClassifiers,
  type AfterUploadClassifier,
} from "../db/afterUploadClassifiers";
import { AfterUploadShooters, type AfterUploadShooter } from "../db/afterUploadShooters";
import { rehydrateClassifiers } from "../db/classifiers";
import { DQs } from "../db/dq";
import { connect } from "../db/index";
import { Matches } from "../db/matches";
import { hydrateRecHHFsForClassifiers } from "../db/recHHF";
import { Scores } from "../db/scores";
import { reclassifyShooters } from "../db/shooters";
import { hydrateStats } from "../db/stats";

export const _fetchPSS3ObjectJSON = async (objectKey: string, noGZip = false) => {
  try {
    const s3Client = new S3Client({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.PS_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.PS_S3_SECRET_ACCESS_KEY!,
      },
    });

    const s3Response = await s3Client.send(
      new GetObjectCommand({
        Bucket: "ps-scores",
        Key: objectKey,
      }),
    );

    const bodyStream = s3Response.Body;
    if (!bodyStream) {
      return null;
    }

    // try gzip first, if that crashes - refetch and don't decompress
    // TODO: rewrite to re-use once fetched data for both (gz and not) pathways
    // (refetching for now, because node closes streams and makes re-use challenging)
    if (!noGZip) {
      try {
        const gz = createGunzip();
        const body = (bodyStream as Readable).pipe(gz);
        const bodyString = await text(body);
        return JSON.parse(bodyString);
      } catch (e) {
        return _fetchPSS3ObjectJSON(objectKey, true);
      }
    } else {
      const bodyString = await bodyStream.transformToString();
      return JSON.parse(bodyString);
    }
  } catch (e) {
    console.error(
      `fetchPSS3ObjectJSON failed: ${objectKey}; ${(e as Error)?.message || ""}`,
    );
    return null;
  }
};

export const fetchPS = async (uuid, { skipResults = false } = {}) => {
  try {
    const [matchDef, scores, results] = await Promise.all([
      _fetchPSS3ObjectJSON(`production/${uuid}/match_def.json`),
      _fetchPSS3ObjectJSON(`production/${uuid}/match_scores.json`),
      skipResults
        ? Promise.resolve(null)
        : _fetchPSS3ObjectJSON(`production/${uuid}/results.json`),
    ]);

    return { matchDef, scores, results };
  } catch (e) {}

  return {};
};

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
  includeHFUDivisions = false,
): { shooters: AfterUploadShooter[]; classifiers: AfterUploadClassifier[] } => {
  const divisionExplosionMap = includeHFUDivisions ? hfuDivisionCompatabilityMap : {};
  const uniqueClassifierDivisionPairs = uniqByTruthyMap(
    scores,
    s => s.classifierDivision,
  );
  const uniqueMemberNumberDivisionPairs = uniqByTruthyMap(
    scores,
    s => s.memberNumberDivision,
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
    },
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
    },
  );

  return {
    classifiers: uniqBy(classifiers, c => c.classifierDivision).filter(
      c => !!c.classifier,
    ),
    shooters: uniqBy(shooters, s => s.memberNumberDivision).filter(s => !!s.memberNumber),
  };
};

const normalizeDivision = divisionNameRaw => {
  const lowercaseNoSpace = divisionNameRaw.toLowerCase().replace(/\s/g, "");
  const normalizationMap = {
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

    // TODO: add other sports here as well
  };

  return normalizationMap[lowercaseNoSpace] || lowercaseNoSpace;
};

const scsaMatchInfo = async matchInfo => {
  const { uuid } = matchInfo;

  // Unlike USPSA, SCSA does not have results.json.
  const { matchDef: match, scores: scoresJson } = await fetchPS(matchInfo.uuid, {
    skipResults: true,
  });
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
  try {
    const { match_shooters, match_stages, match_penalties } = match;
    const shootersMap = Object.fromEntries(match_shooters.map(s => [s.sh_uuid, s.sh_id]));
    const shootersDivisionMap = Object.fromEntries(
      match_shooters.map(s => [s.sh_uuid, s.sh_dvp]),
    );
    match.memberNumberToNamesMap = Object.fromEntries(
      match_shooters.map(s => [s.sh_id, [s.sh_fn, s.sh_ln].filter(Boolean).join(" ")]),
    );
    const classifiersMap = Object.fromEntries(
      match_stages
        .filter(s => !!s.stage_classifiercode)
        .map(s => [s.stage_uuid, s.stage_classifiercode]),
    );

    const { match_scores } = scoresJson;
    const stageScoresMap = match_scores.reduce((acc, cur) => {
      const curStage = acc[cur.stage_uuid] || {};
      cur.stage_stagescores.forEach(cs => {
        curStage[cs.shtr] = cs;
      });
      acc[cur.stage_uuid] = curStage;
      return acc;
    }, {});

    const scores = match_scores
      .filter(ms => {
        const { stage_uuid } = ms;
        const classifierCode = classifiersMap[stage_uuid];
        return (
          classifiersMap[stage_uuid] !== undefined && classifierCode.match(/SC-10[0-8]/g)
        );
      })
      .map(ms => {
        const { stage_uuid, stage_stagescores } = ms;
        const classifier = classifiersMap[stage_uuid];

        return stage_stagescores
          .filter(ss => {
            const divisionCode = shootersDivisionMap[ss.shtr]?.toUpperCase();
            return (
              divisionCode !== undefined &&
              Object.keys(ScsaPeakTimesMap).find(div => div === divisionCode) !==
                undefined
            );
          })
          .filter(ss => {
            const expectedNumStrings = classifier === "SC-104" ? 4 : 5;
            const strings = ss.str;
            // Exclude any score where the string count does not match
            // the official string count for the stated classifier.
            return strings.length === expectedNumStrings;
          })
          .map(ss => {
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
            const pens = ss.penss || [];
            const penaltyCount = pens.flat().reduce((p, c) => p + c, 0);
            const detailedScores = stageScoresMap[stage_uuid]?.[ss.shtr] || {};

            const adjustedStrings = strings
              .map((s, idx) => {
                try {
                  const penCountsForString = pens[idx];
                  // Multiply the count of each penalties by their value, and sum the result.
                  const totalStringPenalties = (penCountsForString || []).reduce(
                    (p, c, penIdx) => p + c * (match_penalties[penIdx]?.pen_val || 0),
                    0,
                  );
                  const adjustedStringTotal = s + totalStringPenalties;
                  // Strings max out at 30 seconds in SCSA.
                  return Math.min(30, adjustedStringTotal);
                } catch (e) {
                  console.log(`bad SCSA match: ${uuid}`);
                  throw e;
                }
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

            const pseudoHf = HF((25 * bestNStrings.length) / stageTotal);

            const classifierPeakTime = scsaPeakTime(divisionCode, classifier);
            const shooterFullName = match.memberNumberToNamesMap[memberNumber];
            const classificationPercent = Percent(classifierPeakTime, stageTotal);

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
              strings: adjustedStrings,
              targetHits: detailedScores.ts,
              device: detailedScores.dname,
              bad: classificationPercent >= 175.0,
              hf: pseudoHf,
              percent: classificationPercent,
              shooterFullName,
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
        r =>
          r.strings.every(x => x > 0) &&
          r.stageTimeSecs > 0 &&
          !!r.memberNumber &&
          !!r.classifier &&
          !!r.division &&
          !!r.memberNumberDivision,
      );

    return { scores, match, results: [] };
  } catch (e) {}

  return EmptyMatchResultsFactory();
};

export const uspsaOrHitFactorMatchInfo = async matchInfo => {
  const { uuid } = matchInfo;
  const { matchDef: match, results, scores: scoresJson } = await fetchPS(uuid);
  if (!match || !results || !scoresJson) {
    return EmptyMatchResultsFactory();
  }
  const { match_shooters, match_stages } = match;
  const shootersMap = Object.fromEntries(match_shooters.map(s => [s.sh_uuid, s.sh_id]));
  match.memberNumberToNamesMap = Object.fromEntries(
    match_shooters.map(s => [s.sh_id, [s.sh_fn, s.sh_ln].filter(Boolean).join(" ")]),
  );
  const classifiersMap = Object.fromEntries(
    match_stages
      .filter(s => !!s.stage_classifiercode)
      .map(s => [s.stage_uuid, normalizeClassifierCode(s.stage_classifiercode)]),
  );
  const classifierUUIDs = Object.keys(classifiersMap);
  const classifierResults = results.filter(r => classifierUUIDs.includes(r.stageUUID));

  const { match_scores } = scoresJson;
  // [stageUUID][shooterUUID]= { ...scoresInfo}
  const stageScoresMap = match_scores.reduce((acc, cur) => {
    const curStage = acc[cur.stage_uuid] || {};
    cur.stage_stagescores.forEach(cs => {
      curStage[cs.shtr] = cs;
    });
    acc[cur.stage_uuid] = curStage;
    return acc;
  }, {});

  const scores = classifierResults
    .map(r => {
      const { stageUUID, ...varNameResult } = r;
      const classifier = classifiersMap[stageUUID];

      // my borther in Christ, this is nested AF!
      return Object.values(varNameResult)[0]?.[0].Overall.map(a => {
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
        const shooterFullName = match.memberNumberToNamesMap[memberNumber];

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
          shooterFullName,
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

        return {
          ...curScore,
          minorHF: minorHF(curScore),
        };
      });
    })
    .flat()
    .filter(
      r =>
        r.hf > 0 &&
        !!r.memberNumber &&
        !!r.classifier &&
        !!r.division &&
        !!r.memberNumberDivision,
    );

  return { scores, match, results };
};

const EmptyMatchResultsFactory = () => ({ scores: [], matches: [], results: [] });

const uploadResultsForMatches = async matches => {
  const matchResults = await Promise.all(
    matches.map(match => {
      switch (match.templateName) {
        case "Steel Challenge":
          return scsaMatchInfo(match);

        case "USPSA":
        case "Hit Factor":
        default: {
          return uspsaOrHitFactorMatchInfo(match);
        }
      }
    }),
  );

  return matchResults.reduce((acc, cur) => {
    acc.scores = acc.scores.concat(cur.scores);
    acc.matches = acc.matches.concat(cur.match);
    acc.results = acc.results.concat(cur.results);
    return acc;
  }, EmptyMatchResultsFactory());
};

export const uploadResultsForMatchUUIDs = async uuidsRaw => {
  const uuids = uuidsRaw.filter(maybeUUID => uuidsFromUrlString(maybeUUID)?.length === 1);
  if (!uuids?.length) {
    return [];
  }

  const matches = await Matches.find({ uuid: { $in: uuids } })
    .limit(0)
    .lean();

  return uploadResultsForMatches(matches);
};

export const processUploadResults = async ({ uploadResults }) => {
  try {
    const { scores: scoresRaw, matches: matchesRaw } = uploadResults;
    const scores = scoresRaw.filter(Boolean);
    const matches = matchesRaw.filter(Boolean);
    const shooterNameMap = matches.reduce(
      (acc, cur) => ({
        ...acc,
        ...cur.memberNumberToNamesMap,
      }),
      {},
    );

    try {
      const dqDocs = matches.reduce((acc, match) => {
        match.match_shooters.forEach(shooter => {
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
        dqDocs.map(dq => ({
          updateOne: {
            filter: {
              memberNumber: dq.memberNumber,
              division: dq.division,
              upload: dq.upload,
            },
            update: { $set: dq },
            upsert: true,
          },
        })),
      );
    } catch (e) {
      console.error("failed to save dqs");
      console.error(e);
    }

    if (!scores.length) {
      return { classifiers: [], shooters: [], matches: [] };
    }
    console.time("scoreWrite");
    await Scores.bulkWrite(
      scores.map(s => ({
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
      })),
    );
    console.timeEnd("scoreWrite");

    const { classifiers, shooters } = classifiersAndShootersFromScores(
      scores,
      shooterNameMap,
      true,
    );
    await Promise.all([
      AfterUploadClassifiers.bulkWrite(
        classifiers.map(c => ({
          updateOne: {
            filter: { classifierDivision: c.classifierDivision },
            update: { $set: c },
            upsert: true,
          },
        })),
      ),
      AfterUploadShooters.bulkWrite(
        shooters.map(s => ({
          updateOne: {
            filter: { memberNumberDivision: s.memberNumberDivision },
            update: { $set: s },
            upsert: true,
          },
        })),
      ),
    ]);

    const publicShooters = features.hfu
      ? shooters
      : shooters.filter(s => !hfuDivisionsShortNames.includes(s.division));
    const publicClassifiers = features.hfu
      ? classifiers
      : classifiers.filter(c => !hfuDivisionsShortNames.includes(c.division));

    return {
      shooters: publicShooters,
      classifiers: publicClassifiers,
      matches: uniqBy(scores, s => s.upload).map(s => s.upload),
    };
  } catch (err) {
    const e = err as Error;
    console.error(e);
    return { error: `${e.name}: ${e.message}`, matches: [] };
  }
};

export const matchesForUploadFilter = (extraFilter = {}) => ({
  ...extraFilter,
  $expr: { $gt: ["$updated", "$uploaded"] },
});

export const findAFewMatches = async (extraFilter, batchSize) =>
  Matches.find(matchesForUploadFilter(extraFilter)).limit(batchSize).sort({ updated: 1 });

export const uploadMatches = async ({ matches }) =>
  processUploadResults({
    uploadResults: await uploadResultsForMatches(matches),
  });

// legacy upload from frontend, not used anymore
export const uploadMatchesFromUUIDs = async uuids =>
  processUploadResults({
    uploadResults: await uploadResultsForMatchUUIDs(uuids),
  });

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

const metaClassifiersLoop = async (batchSize = 8) => {
  const totalCount = await AfterUploadClassifiers.countDocuments({});
  console.log(`${totalCount} classifiers to update`);

  let updated = 0;
  let classifiers = [] as (AfterUploadClassifier & { _id: ObjectId })[];
  do {
    classifiers = await AfterUploadClassifiers.find({}).limit(batchSize).lean();
    if (!classifiers.length) {
      break;
    }

    await hydrateRecHHFsForClassifiers(classifiers);
    await rehydrateClassifiers(classifiers);
    await AfterUploadClassifiers.deleteMany({
      _id: { $in: classifiers.map(c => c._id) },
    });

    updated += classifiers.length;
    process.stdout.write(`\r${updated}/${totalCount}`);
  } while (classifiers.length);
  if (updated) {
    process.stdout.write(`\n`);
  }
};

const metaShootersLoop = async (batchSize = 8) => {
  const totalCount = await AfterUploadShooters.countDocuments({});
  console.log(`${totalCount} shooters to update`);

  let updated = 0;
  let shooters = [] as (AfterUploadShooter & { _id: ObjectId })[];
  do {
    shooters = await AfterUploadShooters.find({}).limit(batchSize).lean();
    if (!shooters.length) {
      break;
    }
    await reclassifyShooters(shooters);
    await AfterUploadShooters.deleteMany({
      _id: { $in: shooters.map(s => s._id) },
    });

    updated += shooters.length;
    process.stdout.write(`\r${updated}/${totalCount}`);
  } while (shooters.length);
  if (updated) {
    process.stdout.write(`\n`);
  }
};

export const metaLoop = async (curTry = 1, maxTries = 3) => {
  try {
    await metaClassifiersLoop();
    await metaShootersLoop();
    await hydrateStats();
  } catch (err) {
    console.error(err);
    if (curTry < maxTries) {
      return metaLoop(curTry + 1, maxTries);
    }
  }
};
