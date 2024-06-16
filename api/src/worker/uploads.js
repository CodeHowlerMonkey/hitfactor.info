import uniqBy from "lodash.uniqby";
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

    // recalc all stats without waiting
    await hydrateStats();
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

    const { classifiers, shooters } = classifiersAndShootersFromScores(
      scores,
      shooterNameMap
    );
    setImmediate(async () => {
      await afterUpload(classifiers, shooters);
    });

    return {
      shooters,
      classifiers,
    };
  } catch (e) {
    console.error(e);
    return { error: `${e.name}: ${e.message}` };
  }
};
