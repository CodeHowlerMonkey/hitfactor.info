/* eslint-disable no-console */
import mongoose, { Model } from "mongoose";

import { Shooter } from "./shooters";

export interface MatchScore {
  upload: string;
  memberNumber: string;
  division: string;
  memberNumberDivision: string;
  shooterFullName?: string;

  matchPercent: number;
  percentOfPossible: number;
}

export interface MatchScoreVirtuals {
  shooter: Shooter;
  shooterRecPercent: number;
}

type MatchScoreModel = Model<MatchScore, object, MatchScoreVirtuals>;
export type ScoreObjectWithVirtuals = MatchScore & MatchScoreVirtuals & { _id: string };

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

    matchPercent: Number,
    percentOfPossible: Number,
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
