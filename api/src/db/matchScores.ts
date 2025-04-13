/* eslint-disable no-console */
import uniqBy from "lodash.uniqby";
import mongoose, { Model } from "mongoose";

import { MatchScore } from "../../../shared/types/MatchScore";
import { calculateUSPSAClassification } from "../../../shared/utils/classification";

import { scoresForRecommendedClassification, Shooter } from "./shooters";

export interface MatchScoreVirtuals {
  shooter: Shooter;
  shooterRecPercent: number;
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
    memberNumber: String,
    division: String,
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
    const date = c.date || scoresByMemberNumber[c.memberNumber]?.[0]?.date || new Date();
    const reclass = calculateUSPSAClassification(
      scoresByMemberNumber[c.memberNumber],
      "recPercent",
      date,
      "brutal",
      8,
      8,
      12,
      110,
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
