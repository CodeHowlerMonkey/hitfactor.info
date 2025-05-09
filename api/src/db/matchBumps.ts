/* eslint-disable no-console */
import mongoose from "mongoose";

import { MatchBump } from "@data/types/MatchBump";
import {
  eligibilityFilter,
  grandmasterPercent,
  masterPercent,
  MatchScore,
} from "@data/types/MatchScore";
import { matchBumpThresholds } from "@shared/constants/difficulty";
import {
  correlation,
  EmptyLinearRegression,
  linearRegression,
  reverseLinear,
} from "@shared/utils/weibull";

const MatchBumpSchema = new mongoose.Schema<MatchBump>(
  {
    date: Date,
    upload: String,
    division: String,
    uploadDivision: String,

    slope: Number,
    intercept: Number,
    mae: Number,

    maxClassification: Number,
    minClassification: Number,
    maxBump: Number,
    minBump: Number,

    correlation: Number,

    dataPoints: Number,
    masters: Number,
    grandmasters: Number,

    filteredCorrelation: Number,

    filteredDataPoints: Number,
    filteredMasters: Number,
    filteredGrandmasters: Number,
  },
  { strict: false },
);

// Eligibility Criteria:
//     - Eligible Correlation  >= 85%
//     - Eligible Datapoints   >= 30 (maybe) >= 50 (eligible)
MatchBumpSchema.virtual("eligible").get(function () {
  return (
    this.filteredDataPoints >= matchBumpThresholds.filteredDataPoints &&
    this.filteredCorrelation >= matchBumpThresholds.filteredCorrelation
  );
});

MatchBumpSchema.virtual("maybeEligible").get(function () {
  return (
    this.filteredDataPoints >= matchBumpThresholds.filteredDataPointsMaybe &&
    this.filteredCorrelation >= matchBumpThresholds.filteredCorrelation
  );
});

MatchBumpSchema.set("toObject", { virtuals: true });
MatchBumpSchema.set("toJSON", { virtuals: true });

MatchBumpSchema.index({ upload: 1 });
MatchBumpSchema.index({ date: 1 });
MatchBumpSchema.index({ date: -1 });
MatchBumpSchema.index({ uploadDivision: 1 });
MatchBumpSchema.index({ uploadDivision: 1, date: 1 });
MatchBumpSchema.index({ uploadDivision: 1, date: -1 });

export const MatchBumps = mongoose.model<typeof MatchBumpSchema>(
  "MatchBumps",
  MatchBumpSchema,
);

const population = (data: MatchScore[], minPercent: number) =>
  data.filter(
    c =>
      c.matchPercent >= minPercent && (c.shooterRecPercentHistorical ?? 0) >= minPercent,
  ).length;

export const matchBumpsForMatchResults = (matchScores: MatchScore[]): MatchBump[] => {
  const matchScoresByUploadDivision = matchScores.reduce(
    (acc, cur) => {
      const key = [cur.upload, cur.division].join(":");
      acc[key] = acc[key] || [];
      acc[key].push(cur);
      return acc;
    },
    {} as Record<string, MatchScore[]>,
  );

  return Object.keys(matchScoresByUploadDivision).map(uploadDivision => {
    const data = matchScoresByUploadDivision[uploadDivision]
      .map(c => ({
        ...c,
        x: c.shooterRecPercentHistorical ?? 0,
        y: c.matchPercent,
      }))
      .sort((a, b) => b.x - a.x);
    const maxClassification = data[0].x;
    const minClassification = data[data.length - 1].x;

    const eligibleData = data.filter(eligibilityFilter);
    const lrr = !eligibleData.length
      ? EmptyLinearRegression
      : linearRegression(eligibleData);

    const dataWithBumps = data
      .map(c => ({ ...c, matchBump: reverseLinear(c, lrr) }))
      .sort((a, b) => b.matchBump - a.matchBump);
    const maxBump = dataWithBumps[0].matchBump;
    const minBump = dataWithBumps[data.length - 1].matchBump;

    const [upload, division] = uploadDivision.split(":");
    return {
      upload,
      division,
      uploadDivision,

      date: data?.[0]?.date,

      slope: lrr.slope,
      intercept: lrr.intercept,
      mae: lrr.mae,
      maxClassification,
      minClassification,
      maxBump,
      minBump,

      dataPoints: data.length,
      filteredDataPoints: eligibleData.length,
      masters: population(data, masterPercent),
      grandmasters: population(data, grandmasterPercent),
      filteredMasters: population(eligibleData, masterPercent),
      filteredGrandmasters: population(eligibleData, grandmasterPercent),

      correlation:
        data.length > 2
          ? correlation(
              data.map(c => c.x),
              data.map(c => c.y),
            ) || 0
          : 0,
      filteredCorrelation:
        eligibleData.length > 2
          ? correlation(
              eligibleData.map(c => c.x),
              eligibleData.map(c => c.y),
            ) || 0
          : 0,
    };
  });
};

export const saveMatchBumps = async (matchBumps: MatchBump[]) => {
  try {
    await MatchBumps.bulkWrite(
      matchBumps.map(matchBump => ({
        updateOne: {
          filter: {
            uploadDivision: matchBump.uploadDivision,
          },
          update: { $set: matchBump },
          upsert: true,
        },
      })),
    );
  } catch (e) {
    console.error("failed to save match scores");
    console.error(e);
  }
};
