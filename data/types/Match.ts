export interface Match {
  updated: Date;
  created: Date;
  uuid: string;
  id: number;
  name: string;

  type: string;
  subType: string;
  templateName: string;

  /* match_date string as-is e.g. "2024-01-01" */
  date: string;
  fetched?: Date;
  uploaded?: Date;
}

export interface MatchVirtualsNoRefs {
  level: number;
}

export type MatchWithNoRefVirtuals = Match & MatchVirtualsNoRefs;
