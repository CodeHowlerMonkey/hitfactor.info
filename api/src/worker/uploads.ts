/* eslint-disable no-console */

import uniqBy from "lodash.uniqby";
import { ObjectId } from "mongoose";

import features from "../../../shared/features";
import { UTCDate } from "../../../shared/utils/date";
import { minorHF } from "../../../shared/utils/hitfactor";
import { uuidsFromUrlString } from "../../../shared/utils/uuid";
import { normalizeClassifierCode } from "../dataUtil/classifiersData";
import {
  arrayWithExplodedDivisions,
  hfuDivisionCompatabilityMap,
  hfuDivisionsShortNames,
  pairToDivision,
} from "../dataUtil/divisions";
import { curHHFForDivisionClassifier } from "../dataUtil/hhf";
import { Percent } from "../dataUtil/numbers";
import {
  AfterUploadClassifiers,
  type AfterUploadClassifier,
} from "../db/afterUploadClassifiers";
import { AfterUploadShooters, type AfterUploadShooter } from "../db/afterUploadShooters";
import { rehydrateClassifiers } from "../db/classifiers";
import { DQs } from "../db/dq";
import { connect } from "../db/index";
import { Match, MatchDef, Matches } from "../db/matches";
import { MatchScore, saveMatchScores } from "../db/matchScores";
import { hydrateRecHHFsForClassifiers } from "../db/recHHF";
import { Score, Scores } from "../db/scores";
import { reclassifyShooters } from "../db/shooters";
import { hydrateStats } from "../db/stats";

import { scsaMatchInfo } from "./scsaUploads";
import {
  EmptyMatchResultsFactory,
  EmptySingleMatchResultFactory,
  fetchPS,
} from "./uploadsCommon";

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
  const stageNameMap = scores.reduce((acc, s) => {
    acc[s.classifier] = s.classifierName;
    return acc;
  }, {});

  const classifiers = arrayWithExplodedDivisions(
    uniqueClassifierDivisionPairs,
    divisionExplosionMap,
    pairToDivision,
    (originalClassifierDivision, division) => {
      const classifier = originalClassifierDivision.split(":")[0];
      return {
        classifierDivision: [classifier, division].join(":"),
        name: stageNameMap[classifier],
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

const badCharsRegExp = /[\s:\t.,\-_+=!?']/gi;
const memberNumberFromMatchDefShooter = (s, mustHaveMemberNumbers) => {
  if (mustHaveMemberNumbers) {
    return s.sh_id?.toUpperCase();
  }

  return (
    s.sh_id || [s.sh_fn, s.sh_ln].join("").replace(badCharsRegExp, "")
  ).toUpperCase();
};

const classifierCodeFromMatchDefStage = (s, onlyActualClassifiers) => {
  if (onlyActualClassifiers) {
    return normalizeClassifierCode(s.stage_classifiercode);
  }

  return `${s.stage_number || ""}.${s.stage_name.replace(badCharsRegExp, "").toUpperCase()}`;
};

interface IntermediateScore extends Score {
  // Major Match Scores Fields
  matchPercent?: number;
  matchPoints?: number;
  percentOfPossible?: number;
}

export const hitFactorLikeMatchInfo = (
  matchInfo: Match,
  s3MatchFiles,
  onlyClassifiers: boolean = true,
  mustHaveMemberNumbers: boolean = true,
  includeMajorResults: boolean = false,
): { match: MatchDef; results: unknown; scores: IntermediateScore[] } => {
  const { matchDef: match, results, scores: scoresJson } = s3MatchFiles;
  if (!match || !results || !scoresJson) {
    return EmptySingleMatchResultFactory(match);
  }
  const { match_shooters, match_stages } = match;
  const shootersMap = Object.fromEntries(
    match_shooters.map(s => [
      s.sh_uuid,
      memberNumberFromMatchDefShooter(s, mustHaveMemberNumbers),
    ]),
  );
  match.memberNumberToNamesMap = Object.fromEntries(
    match_shooters.map(s => [
      memberNumberFromMatchDefShooter(s, mustHaveMemberNumbers),
      [s.sh_fn, s.sh_ln].filter(Boolean).join(" "),
    ]),
  );
  const classifiersMap = Object.fromEntries(
    match_stages
      .filter(s => s.stage_scoretype !== "Chrono")
      .filter(s => !onlyClassifiers || !!s.stage_classifiercode)
      .map(s => [s.stage_uuid, classifierCodeFromMatchDefStage(s, onlyClassifiers)]),
  );
  const classifierNamesMap = Object.fromEntries(
    match_stages
      .filter(s => !onlyClassifiers || !!s.stage_classifiercode)
      .map(s => [s.stage_uuid, `${s.stage_number}. ${s.stage_name}`]),
  );
  const classifierUUIDs = Object.keys(classifiersMap);
  const classifierResults = results.filter(
    r =>
      classifierUUIDs.includes(r.stageUUID) || (includeMajorResults && r.Match?.length),
  );

  const { match_scores } = scoresJson;
  // [stageUUID][shooterUUID]= { ...scoresInfo}
  const stageScoresMap = (match_scores || []).reduce((acc, cur) => {
    const curStage = acc[cur.stage_uuid] || {};
    cur.stage_stagescores.forEach(cs => {
      curStage[cs.shtr] = cs;
    });
    acc[cur.stage_uuid] = curStage;
    return acc;
  }, {});

  const scores = classifierResults
    .map(r => {
      const { stageUUID, Match: matchOverall, ...varNameResult } = r;

      if (matchOverall?.length) {
        return matchOverall
          .map(divisionBucket => {
            const classifier = "matchOverall";
            const divisionKey = Object.keys(divisionBucket)[0];
            const division = normalizeDivision(divisionKey);

            return divisionBucket[divisionKey].map(a => {
              const memberNumber = shootersMap[a.shooter]?.toUpperCase();
              const shooterFullName = match.memberNumberToNamesMap[memberNumber];
              const date = new Date(match.match_date);

              const matchPercent = Number(a.matchPercent || "0");
              const matchPoints =
                Number((a.matchPoints || "0").replace(",", "")) || matchPercent;
              const winnerMatchPoints = (100 * matchPoints) / matchPercent;

              return {
                matchPercent,
                matchPoints,
                percentOfPossible: Number(a.percentOfPossible),
                hf: matchPoints,
                hhf: winnerMatchPoints,

                points: Number(a.matchPoints),
                penalties: 0,
                stageTimeSecs: -1,

                // from algolia / matches collection
                type: matchInfo?.type,
                subType: matchInfo?.subType,
                templateName: matchInfo?.templateName,

                // from /match_scores.json
                modified: date,

                percent: Number(a.matchPercent),
                shooterFullName,
                memberNumber,
                classifier,
                classifierName: classifier,
                division,
                upload: match.match_id,
                clubid: match.match_clubcode,
                club_name: match.match_clubname || match.match_name,
                matchName: match.match_name,
                sd: UTCDate(match.match_date),
                code: "N",
                source: "Match Score",
                memberNumberDivision: [memberNumber, division].join(":"),
                classifierDivision: [classifier, division].join(":"),
              };
            });
          })
          .flat();
      }

      // my borther in Christ, this is nested AF!
      return Object.values(varNameResult)[0]?.[0].Overall.map(a => {
        const classifier = classifiersMap[stageUUID];
        const classifierName = classifierNamesMap[stageUUID];
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
          classifierName,
          division,
          upload: match.match_id,
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

export const uspsaOrHitFactorMatchInfo = async matchInfo => {
  const { uuid } = matchInfo;
  const s3MatchFiles = await fetchPS(uuid);
  return hitFactorLikeMatchInfo(matchInfo, s3MatchFiles);
};

export const majorMatchInfo = async matchInfo => {
  const { uuid } = matchInfo;
  const s3MatchFiles = await fetchPS(uuid);
  const result = hitFactorLikeMatchInfo(matchInfo, s3MatchFiles, false, false);
  return {
    ...result,
    match: {
      ...result.match,
      templateName: matchInfo.templateName,
    },
  };
};

export const matchFinishResults = (match, s3MatchFiles): MatchScore[] => {
  try {
    return hitFactorLikeMatchInfo(match, s3MatchFiles, false, true, true)
      .scores.filter(s => s.classifier === "matchOverall" && s.division !== "overall")
      .map(({ memberNumber, division, matchPercent, percentOfPossible }) => ({
        upload: match.uuid,
        memberNumber,
        division,
        memberNumberDivision: [memberNumber, division].join(":"),
        matchPercent: matchPercent || 0,
        percentOfPossible: percentOfPossible || 0,
      }))
      .filter(s => s.matchPercent && s.percentOfPossible);
  } catch (e) {
    console.error(e);
  }

  return [] as MatchScore[];
};

export const uploadResultsForMatches = async matches => {
  const matchResults = await Promise.all(
    matches.map(async match => {
      switch (match.templateName) {
        case "Steel Challenge":
          return scsaMatchInfo(match);

        case "Major":
          return majorMatchInfo(match);

        case "USPSA":
        case "Hit Factor":
        default: {
          const { uuid } = match;
          const s3MatchFiles = await fetchPS(uuid);
          const uploadResults = hitFactorLikeMatchInfo(match, s3MatchFiles);

          return {
            ...uploadResults,
            matchResults: matchFinishResults(match, s3MatchFiles),
          };
        }
      }
    }),
  );

  return matchResults.reduce((acc, cur) => {
    acc.scores = acc.scores.concat(cur.scores);
    acc.matches = acc.matches.concat(cur.match);
    acc.results = acc.results.concat(cur.results);
    acc.matchResults = acc.matchResults.concat(cur.matchResults);
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

export const processDQs = async matches => {
  try {
    const dqDocs = matches.reduce((acc, match) => {
      match.match_shooters.forEach(shooter => {
        if (!shooter.sh_dq) {
          return;
        }

        acc.push({
          memberNumber: memberNumberFromMatchDefShooter(
            shooter,
            match.templateName !== "PCSLNats",
          ),
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
};

export const processUploadResults = async ({ uploadResults }) => {
  try {
    const { scores: scoresRaw, matches: matchesRaw, matchResults } = uploadResults;
    const scores = scoresRaw.filter(Boolean);
    const matches = matchesRaw.filter(Boolean);
    const shooterNameMap = matches.reduce(
      (acc, cur) => ({
        ...acc,
        ...cur.memberNumberToNamesMap,
      }),
      {},
    );

    await processDQs(matches);
    await saveMatchScores(matchResults);

    if (!scores.length) {
      return { classifiers: [], shooters: [], matches: [], matchResults };
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
    await AfterUploadShooters.bulkWrite(
      shooters.map(s => ({
        updateOne: {
          filter: { memberNumberDivision: s.memberNumberDivision },
          update: { $set: s },
          upsert: true,
        },
      })),
    );
    await AfterUploadClassifiers.bulkWrite(
      classifiers.map(c => ({
        updateOne: {
          filter: { classifierDivision: c.classifierDivision },
          update: { $set: c },
          upsert: true,
        },
      })),
    );

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
      matchResults,
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

const metaRecHHFsLoop = async () => {
  const totalCount = await AfterUploadClassifiers.countDocuments({});
  console.log(`${totalCount} recHHFs to update`);
  const classifiers = await AfterUploadClassifiers.find({}).lean();
  await hydrateRecHHFsForClassifiers(classifiers);
  console.log("recHHFs updated");
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

export const metaLoop = async (
  onlyActualClassifiers = true,
  curTry = 1,
  maxTries = 3,
) => {
  try {
    await metaRecHHFsLoop();
    await metaShootersLoop();
    await metaClassifiersLoop();
    await hydrateStats();
  } catch (err) {
    console.error(err);
    if (curTry < maxTries) {
      return metaLoop(onlyActualClassifiers, curTry + 1, maxTries);
    }
  }
};
