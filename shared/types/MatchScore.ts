export interface MatchScore {
  upload: string;
  memberNumber: string;
  division: string;
  memberNumberDivision: string;
  shooterFullName?: string;
  date: Date;

  matchPercent: number;
  percentOfPossible: number;

  // after backfill
  shooterRecPercentHistorical?: number;
  shooterRecPercentHistoricalHigh?: number;
  shooterRecPercentHistoricalAge?: number;
}

export const maxPercentDifference = 15;
export const maxAge = 18;

// minus 5 for both match and classification
export const grandmasterPercent = 90;
export const masterPercent = 80;

export const eligibilityFilter = (c: MatchScore) =>
  c.matchPercent > 0 &&
  (c.shooterRecPercentHistorical ?? 0) > 0 &&
  Math.abs(c.matchPercent - (c.shooterRecPercentHistorical ?? 0)) <=
    maxPercentDifference &&
  (c.shooterRecPercentHistoricalAge ?? 999) <= maxAge &&
  (c.shooterRecPercentHistoricalHigh ?? 0) > 0;
