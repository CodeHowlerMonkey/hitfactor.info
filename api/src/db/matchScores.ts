/* eslint-disable no-console */
import uniqBy from "lodash.uniqby";
import mongoose, { Model } from "mongoose";

import { scoresForRecommendedClassification, Shooter } from "@api/db/shooters";
import { MatchWithNoRefVirtuals } from "@data/types/Match";
import { MatchBumpWithVirtuals } from "@data/types/MatchBump";
import { MatchScore } from "@data/types/MatchScore";
import { classificationDifficulty } from "@shared/constants/difficulty";
import { calculateUSPSAClassification } from "@shared/utils/classification";

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

export const saveMatchScores = async (matchResults: MatchScore[]) => {
  try {
    await MatchScores.bulkWrite(
      matchResults.map(matchScore => ({
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

export const backfillClassifications = async (
  matchScores: MatchScore[],
): Promise<MatchScore[]> => {
  // add historical reclassification
  const memberNumbers = uniqBy(
    matchScores.map(c => c.memberNumber),
    c => c,
  );
  const scores = await scoresForRecommendedClassification(memberNumbers);
  const scoresByMemberNumber = scores.reduce((acc, s) => {
    acc[s.memberNumber] ??= [];
    acc[s.memberNumber].push(s);
    return acc;
  }, {});

  return matchScores.map(c => {
    const date = c.date || new Date();
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
  division: string;
  memberNumber?: string;
  match?: string;
}

type MatchScoresExtra = MatchScoreObjectWithVirtuals &
  MatchBumpWithVirtuals & {
    level: number;
    name: string;
    eligible: boolean;
    bump: number;
  };
export const matchScoresFor = async ({
  division,
  memberNumber,
  match,
}: MatchScoresFilter): Promise<MatchScoresExtra[]> => {
  const filter = {
    division,
    ...(memberNumber ? { memberNumber } : {}),
    ...(match ? { upload: match } : {}),
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
}: MatchScoresFilter) => {
  const matchScores = await matchScoresFor({ division, memberNumber });
  const explodedMatchScores = matchScores
    .filter(ms => ms.eligible)
    .map(ms => new Array(matchWeightForLevel(ms?.level || 0)).fill(ms))
    .flat();

  return explodedMatchScores.map(ms => ({
    source: "Major Match",
    classifier: "",
    division,
    sd: ms.date,
    percent: ms.bump || 0,
    curPercent: ms.bump || 0,
    recPercent: ms.bump || 0,
  }));
};
