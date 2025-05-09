export interface MatchBump {
  upload: string;
  division: string;
  uploadDivision: string;

  date: Date;

  // Linear Regression
  slope: number;
  intercept: number;
  mae: number;

  maxClassification: number;
  minClassification: number;
  maxBump: number;
  minBump: number;

  correlation: number;
  filteredCorrelation: number;

  dataPoints: number;
  masters: number;
  grandmasters: number;

  filteredDataPoints: number;
  filteredMasters: number;
  filteredGrandmasters: number;
}

export interface MatchBumpVirtuals {
  eligible: boolean;
  maybeEligible: boolean;
}

export type MatchBumpWithVirtuals = MatchBump & MatchBumpVirtuals;
