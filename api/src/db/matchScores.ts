/* eslint-disable no-console */
import uniqBy from "lodash.uniqby";
import mongoose, { Model } from "mongoose";

import { scoresForRecommendedClassification, Shooter } from "@api/db/shooters";
import { MatchWithNoRefVirtuals } from "@data/types/Match";
import { MatchBumpWithVirtuals } from "@data/types/MatchBump";
import { MatchScore } from "@data/types/MatchScore";
import { classificationDifficulty } from "@shared/constants/difficulty";
import { calculateUSPSAClassification } from "@shared/utils/classification";
import { UTCDate } from "@shared/utils/date";

export interface MatchScoreVirtuals {
  shooter: Shooter;
  shooterRecPercent: number;
  match: MatchWithNoRefVirtuals;
  matchBump: MatchBumpWithVirtuals;
}

type MatchScoreModel = Model<MatchScore, object, MatchScoreVirtuals>;
export type MatchScoreObjectWithVirtuals = MatchScore &
  MatchScoreVirtuals & { _id: string };

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
    memberNumberDivision: String,
    shooterFullName: String,
    date: Date,

    matchPercent: Number,
    percentOfPossible: Number,

    shooterRecPercentHistorical: Number,
    shooterRecPercentHistoricalHigh: Number,
    shooterRecPercentHistoricalAge: Number,
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

export const MatchScores = mongoose.model<typeof MatchScoreSchema>(
  "MatchScores",
  MatchScoreSchema,
);

export const saveMatchScores = async (
  matchResults: (MatchScore & { _id?: string })[],
) => {
  try {
    await MatchScores.bulkWrite(
      matchResults.map(({ _id, ...matchScore }) => ({
        updateOne: {
          filter: {
            memberNumberDivision: matchScore.memberNumberDivision,
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

interface ScoresForModeArgs {
  mode: "combo" | "classifiers" | "majors";
  memberNumbers: string[];
  division?: string;
  until?: Date;
}

export const scoresForMode = async ({
  mode,
  memberNumbers,
  division,
  until,
}: ScoresForModeArgs) => {
  const getClassifiers = async () =>
    scoresForRecommendedClassification(memberNumbers, division, until);
  const getMatchScores = async () =>
    matchScoresForClassification({ memberNumber: memberNumbers, division, until });

  switch (mode) {
    case "combo":
      return (await getClassifiers()).concat(await getMatchScores());
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
  const scores = await scoresForMode({ mode: "combo", memberNumbers, until: matchDate });
  const scoresByMemberNumber = scores.reduce((acc, s) => {
    acc[s.memberNumber] ??= [];
    acc[s.memberNumber].push(s);
    return acc;
  }, {});

  return matchScores.map(c => {
    const date = matchDate ?? (c.date || new Date());
    const reclass = calculateUSPSAClassification(
      scoresByMemberNumber[c.memberNumber]?.filter(
        score => score.sd.getTime() < date.getTime(),
      ),
      "recPercent",
      date,
      "brutal",
      classificationDifficulty.window.min,
      classificationDifficulty.window.best,
      classificationDifficulty.window.recent,
      classificationDifficulty.percentCap,
    )[c.division];

    return {
      ...c,
      date,
      shooterRecPercentHistorical: reclass?.percent || 0,
      shooterRecPercentHistoricalHigh: reclass?.highPercent || 0,
      shooterRecPercentHistoricalAge: reclass?.age || 999,
    };
  });
};

interface MatchScoresFilter {
  division?: string;
  memberNumber?: string | string[];
  match?: string;
  until?: Date;
}

type MatchScoresExtra = MatchScoreObjectWithVirtuals &
  MatchBumpWithVirtuals & {
    level: number;
    name: string;
    eligible: boolean;
    maybeEligible: boolean;
    bump: number;
  };
export const matchScoresFor = async ({
  division,
  memberNumber,
  match,
  until,
}: MatchScoresFilter): Promise<MatchScoresExtra[]> => {
  const filter = {
    ...(division ? { division } : {}),
    ...(memberNumber
      ? { memberNumber: { $in: ([] as string[]).concat(memberNumber) } }
      : {}),
    ...(match ? { upload: match } : {}),
    ...(until ? { date: { $lt: UTCDate(until) } } : {}),
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
      };
    })
    .filter(Boolean) as MatchScoresExtra[];
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

export const matchScoresForClassification = async ({
  division,
  memberNumber,
  until,
}: MatchScoresFilter) => {
  const matchScores = await matchScoresFor({ division, memberNumber, until });
  const explodedMatchScores = matchScores
    .filter(ms => ms.maybeEligible)
    .map(ms => new Array(matchWeightForLevel(ms?.level || 0)).fill(ms))
    .flat();

  return explodedMatchScores.map(ms => ({
    source: "Major Match",
    classifier: "",
    memberNumber: ms.memberNumber,
    division: ms.division,
    sd: ms.date,
    percent: ms.bump || 0,
    curPercent: ms.bump || 0,
    recPercent: ms.bump || 0,
  }));
};
