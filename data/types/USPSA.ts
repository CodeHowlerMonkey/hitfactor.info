/**
 * @file Types for data from USPSA API and related adapters.
 */

/* used for both USPSA and SCSA, based on USPSA one */
export interface HHFJSON {
  id: string;
  classifier: string; // number id of classifier in classifers.json
  hhf: string; // number in toFixed(4)
  updated: string; // e.g. "2022-03-01 21:39:39"
}

/**
 * As-is from USPSA API Response
 * fields that are not set in SCSA adapter
 */
export interface USPSAHHFJSON extends HHFJSON {
  division: string; // number id of division in division.json
  updated: string; // date in "2022-03-01 21:39:59" format
}

export type USPSAHHFJSONDivision = string;

export enum ClassificationLetterEnum {
  X = "X",
  U = "U",
  D = "D",
  C = "C",
  B = "B",
  A = "A",
  M = "M",
  GM = "GM",
}
export type ClassificationLetter = keyof typeof ClassificationLetterEnum;

export interface ActiveMember {
  generated: Date;
  memberId: number;

  expires: Date;

  co: ClassificationLetter;
  l10: ClassificationLetter;
  lo: ClassificationLetter;
  ltd: ClassificationLetter;
  opn: ClassificationLetter;
  pcc: ClassificationLetter;
  prod: ClassificationLetter;
  rev: ClassificationLetter;
  ss: ClassificationLetter;
}
