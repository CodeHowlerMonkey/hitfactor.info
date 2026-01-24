/* eslint-disable no-console */
import uniqBy from "lodash.uniqby";
import mongoose, { Model } from "mongoose";

import { scoresForRecommendedClassification, Shooter } from "@api/db/shooters";
import { MatchWithNoRefVirtuals } from "@data/types/Match";
import { MatchBumpWithVirtuals } from "@data/types/MatchBump";
import { MatchScore } from "@data/types/MatchScore";
import { ScoresMode, ScoreSource } from "@data/types/ScoresModes";
import { calculateUSPSAClassification } from "@shared/classification/engine";
import { classificationDifficulty } from "@shared/constants/difficulty";
import { uspsaDivShortNames } from "@shared/constants/divisions";
import { UTCDate } from "@shared/utils/date";
import { dateSort } from "@shared/utils/sort";

export interface MatchScoreVirtuals {
  shooter: Shooter;
  shooterRecPercent: number;
  match: MatchWithNoRefVirtuals;
  matchBump: MatchBumpWithVirtuals;
}

type MatchScoreModel = Model<MatchScore, object, MatchScoreVirtuals>;
export type MatchScoreObjectWithVirtuals = MatchScore &
  MatchScoreVirtuals & { _id: mongoose.Types.ObjectId };

export type MatchScoreWithExtras = MatchScoreObjectWithVirtuals &
  MatchBumpWithVirtuals & {
    level: number;
    name: string;
    eligible: boolean;
    maybeEligible: boolean;
    bump: number;
  };

const MatchScoreSchema = new mongoose.Schema<
  MatchScore,
  MatchScoreModel,
  MatchScoreVirtuals
>(
  {
    upload: String,
    division: String,
    uploadDivision: String,

    memberNumber: String,
    originalMemberNumber: String,
    memberNumberDivision: String,
    shooterFullName: String,
    date: Date,

    matchPercent: Number,
    percentOfPossible: Number,

    shooterRecPercentHistorical: Number,
    shooterRecPercentHistoricalHigh: Number,
    shooterRecPercentHistoricalAge: Number,

    shooterMajorsPercentHistorical: Number,
    shooterMajorsPercentHistoricalHigh: Number,
    shooterMajorsPercentHistoricalAge: Number,

    shooterClassifiersPercentHistorical: Number,
    shooterClassifiersPercentHistoricalHigh: Number,
    shooterClassifiersPercentHistoricalAge: Number,
  },
  { strict: false },
);

MatchScoreSchema.virtual("shooter", {
  ref: "Shooters",
  foreignField: "memberNumberDivision",
  localField: "memberNumberDivision",
  justOne: true,
});

MatchScoreSchema.virtual("match", {
  ref: "Matches",
  foreignField: "uuid",
  localField: "upload",
  justOne: true,
});

MatchScoreSchema.virtual("matchBump", {
  ref: "MatchBumps",
  foreignField: "uploadDivision",
  localField: "uploadDivision",
  justOne: true,
});

MatchScoreSchema.virtual("shooterRecPercent").get(function () {
  return this.shooter?.reclassificationsRecPercentUncappedCurrent;
});
MatchScoreSchema.virtual("shooterRecPercentHigh").get(function () {
  return this.shooter?.reclassificationsRecPercentUncappedHigh;
});

MatchScoreSchema.index({ memberNumber: 1 });
MatchScoreSchema.index({ memberNumberDivision: 1 });
MatchScoreSchema.index({ upload: 1 });
MatchScoreSchema.index({ memberNumberDivision: 1, upload: 1 });

export const MatchScores =
  (mongoose.models.MatchScores as MatchScoreModel) ||
  mongoose.model<typeof MatchScoreSchema>("MatchScores", MatchScoreSchema);

export const saveMatchScores = async (
  matchResults: (MatchScore & { _id?: string })[],
) => {
  try {
    await MatchScores.bulkWrite(
      matchResults.map(({ _id, ...matchScore }) => ({
        updateOne: {
          filter: {
            memberNumber: matchScore.memberNumber, // memberNumber:matchUUID key to handle bumps to Open
            upload: matchScore.upload,
          },
          update: { $set: matchScore },
          upsert: true,
        },
      })),
    );
  } catch (e) {
    console.error("failed to save match scores");
    console.error(e);
  }
};

export const deleteDQMatchScores = async (
  dqs: { memberNumber: string; upload: string }[],
) => {
  if (!dqs.length) {
    return;
  }

  try {
    await MatchScores.bulkWrite(
      dqs.map(dq => ({
        deleteOne: {
          filter: {
            memberNumber: dq.memberNumber, // memberNumber:matchUUID key to handle bumps to Open
            upload: dq.upload,
          },
        },
      })),
    );
  } catch (e) {
    console.error("failed to delete dq match scores");
    console.error(e);
  }
};

interface ScoresForModeArgs {
  mode: ScoresMode;
  memberNumbers: string[];
  division?: string;
  until?: Date;
}

export const scoresForMode = async ({
  mode,
  memberNumbers,
  division: divisionParam,
  until,
}: ScoresForModeArgs): Promise<ScoreMini[]> => {
  const division = divisionParam === "all" ? { $in: uspsaDivShortNames } : divisionParam;
  const getClassifiers = async () =>
    scoresForRecommendedClassification({ memberNumbers, division, until });
  const getMatchScores = async () =>
    matchScoresForClassification({ memberNumber: memberNumbers, division, until });

  switch (mode) {
    case "combined":
      return (await getClassifiers())
        .concat(await getMatchScores())
        .toSorted((a, b) => dateSort(a, b, "sd", 1));
    case "classifiers":
      return getClassifiers();
    case "majors":
      return getMatchScores();
  }
};

export const backfillComboClassifications = async (
  matchScores: MatchScore[],
  matchDate?: Date,
): Promise<MatchScore[]> => {
  // add historical reclassification
  const memberNumbers = uniqBy(
    matchScores.map(c => c.memberNumber),
    c => c,
  );
  const scores = await scoresForMode({
    mode: "combined",
    memberNumbers,
    until: matchDate,
  });
  const scoresByMemberNumber = scores.reduce(
    (acc, s) => {
      acc[s.memberNumber] ??= [];
      acc[s.memberNumber].push(s);
      return acc;
    },
    {} as Record<string, ScoreMini[]>,
  );

  return matchScores.map(c => {
    const date = matchDate ?? (c.date || new Date());

    const recalc = (scoreType: ScoreSource | "" = "") =>
      calculateUSPSAClassification(
        scoresByMemberNumber[c.memberNumber]
          ?.filter(s => (!scoreType ? true : s.source === scoreType))
          .filter(score => score.sd.getTime() < date.getTime())
          .map(cur => ({ ...cur, percent: cur.recPercent })),
        date,
        classificationDifficulty.window.min,
        classificationDifficulty.window.best,
        classificationDifficulty.window.recent,
        classificationDifficulty.percentCap,
      )[c.division];
    const reclass = recalc();
    const reclassMajors = recalc("Major Match");
    const reclassClassifiers = recalc("Stage Score");

    return {
      ...c,
      date,
      shooterRecPercentHistorical: reclass?.percent || 0,
      shooterRecPercentHistoricalHigh: reclass?.highPercent || 0,
      shooterRecPercentHistoricalAge: reclass?.age || 999,

      shooterMajorsPercentHistorical: reclassMajors?.percent || 0,
      shooterMajorsPercentHistoricalHigh: reclassMajors?.highPercent || 0,
      shooterMajorsPercentHistoricalAge: reclassMajors?.age || 999,

      shooterClassifiersPercentHistorical: reclassClassifiers?.percent || 0,
      shooterClassifiersPercentHistoricalHigh: reclassClassifiers?.highPercent || 0,
      shooterClassifiersPercentHistoricalAge: reclassClassifiers?.age || 999,
    };
  });
};

interface MatchScoresFilter {
  division?: string | { $in: string[] };
  memberNumber?: string | string[];
  match?: string;
  since?: Date;
  until?: Date;
}

export const matchScoresFor = async ({
  division,
  memberNumber,
  match,
  since,
  until,
}: MatchScoresFilter): Promise<MatchScoreWithExtras[]> => {
  const dateGTE = !since ? {} : { $gt: UTCDate(since) };
  const dateLT = !until ? {} : { $lt: UTCDate(until) };
  const date = !since && !until ? {} : { date: { ...dateGTE, ...dateLT } };
  const filter = {
    ...(division ? { division } : {}),
    ...(memberNumber
      ? { memberNumber: { $in: ([] as string[]).concat(memberNumber) } }
      : {}),
    ...(match ? { upload: match } : {}),
    ...date,
  };

  const shooterMaybe = !memberNumber && !!division && !!match ? ["shooter"] : [];
  const matches = await MatchScores.find(filter)
    .limit(0)
    .populate(["match", "matchBump", ...shooterMaybe]);

  return matches
    .map(m => {
      const c = m.toObject<MatchScoreObjectWithVirtuals>({ virtuals: true });
      if (!c.matchBump) {
        return;
      }
      const { intercept, slope } = c.matchBump;
      const bump = (c.matchPercent - intercept) / slope;
      return {
        ...c.matchBump,
        ...c,
        level: c.match?.level,
        name: c.match?.name,
        eligible: c.matchBump.eligible,
        maybeEligible: c.matchBump.maybeEligible,
        bump,
        division: m.division,
      };
    })
    .filter(Boolean) as MatchScoreWithExtras[];
};

const matchWeightForLevel = (level: number) => {
  switch (level) {
    case 4:
      return 6;
    case 3:
      return 3;
    case 2:
      return 2;
    default:
      return 0;
  }
};

/**
 * Minimal necessary Score object for classification / UI.
 */
export interface ScoreMini {
  source: ScoreSource;
  classifier: string;
  memberNumber: string;
  division: string;
  sd: Date;
  percent: number;
  curPercent: number;
  recPercent: number;
  matchName?: string;

  hf: number;
}

export const matchScoreToScoreAdapter = (ms: MatchScoreWithExtras): ScoreMini => ({
  source: "Major Match",
  classifier: "",
  memberNumber: ms.memberNumber,
  division: ms.division,
  sd: ms.date,
  percent: ms.bump || 0,
  curPercent: ms.bump || 0,
  recPercent: ms.bump || 0,
  matchName: ms.name,

  hf: -1,

  /*
    modified: ms.date,
    hf: -1,
    code: "-",
    type: "uspsa_p",
    subType: "uspsa",
    templateName: "USPSA",
    upload: ms.upload,
    memberNumberDivision: [ms.memberNumber, ms.division].join(":"),
    classifierDivision: `:${ms.division}`,
    _id: ms._id,
    _v: ms._v,
  */
});

export const matchScoresForClassification = async ({
  division,
  memberNumber,
  until,
}: MatchScoresFilter) => {
  const matchScores = await matchScoresFor({ division, memberNumber, until });
  const explodedMatchScores = matchScores
    .filter(ms => ms.eligible && ms.level >= 2)
    .map(ms => new Array(matchWeightForLevel(ms.level)).fill(ms))
    .flat();

  return explodedMatchScores.map(matchScoreToScoreAdapter).filter(c => c.percent > 0);
};
