import classifierInfoJSON from "../../../data/classifiers/classifier_info.json";
import classifiersJSON from "../../../data/classifiers/classifiers.json";
import { HHFJSON } from "../../../data/types/USPSA";

export type USPSAScoring = "Virginia" | "Comstock" | "Fixed Time";
export type SCSAScoring = "Time Plus";
export type Scoring = USPSAScoring | SCSAScoring;

export interface ClassifierJSON {
  id: string;
  classifier: string;
  name: string;
  scoring: Scoring;
}
export interface ClassifierBasicInfo extends ClassifierJSON {
  code: string;
}

export const classifiers: ClassifierJSON[] =
  classifiersJSON.classifiers as ClassifierJSON[];

export const classifierRoundCount: Record<string, number> =
  classifierInfoJSON.stage.reduce((acc, c) => {
    if (!c.round_count) {
      throw new Error(`classifier_info missing round count for ${c.number}`);
    }
    acc[c.number] = c.round_count;
    return acc;
  }, {});

export const classifiersByNumber: Record<string, ClassifierJSON> = classifiers.reduce(
  (acc, cur) => {
    acc[cur.classifier] = cur;
    return acc;
  },
  {} as Record<string, ClassifierJSON>,
);

export const basicInfoForClassifier = (c: ClassifierJSON): ClassifierBasicInfo => ({
  id: c?.id,
  code: c?.classifier,
  classifier: c?.classifier,
  name: c?.name,
  scoring: c?.scoring,
});

export const basicInfoForClassifierCode = (
  classifierCode: string,
): ClassifierBasicInfo | undefined => {
  if (!classifierCode) {
    return undefined;
  }
  const c = classifiers.find(cur => cur.classifier === classifierCode);
  if (!c) {
    return undefined;
  }
  return basicInfoForClassifier(c);
};

/** whitelist for wsb downloads */
export const classifierNumbers = classifiers.map(cur => cur.classifier);
export const uspsaClassifiers = [
  "99-02",
  "99-07",
  "99-08",
  "99-10",
  "99-11",
  "99-12",
  "99-13",
  "99-14",
  "99-16",
  "99-19",
  "99-21",
  "99-22",
  "99-23",
  "99-24",
  "99-28",
  "99-33",
  "99-40",
  "99-41",
  "99-42",
  "99-46",
  "99-47",
  "99-48",
  "99-51",
  "99-53",
  "99-56",
  "99-57",
  "99-59",
  "99-61",
  "99-62",
  "99-63",

  "03-02",
  "03-03",
  "03-04",
  "03-05",
  "03-07",
  "03-08",
  "03-09",
  "03-11",
  "03-12",
  "03-14",
  "03-18",

  "06-01",
  "06-02",
  "06-03",
  "06-04",
  "06-05",
  "06-06",
  "06-10",

  "08-01",
  "08-02",
  "08-03",

  "09-01",
  "09-02",
  "09-03",
  "09-04",
  "09-07",
  "09-08",
  "09-09",
  "09-10",
  "09-13",
  "09-14",

  "13-01",
  "13-02",
  "13-03",
  "13-04",
  "13-05",
  "13-06",
  "13-07",
  "13-08",

  "18-01",
  "18-02",
  "18-03",
  "18-04",
  "18-05",
  "18-06",
  "18-07",
  "18-08",
  "18-09",

  "19-01",
  "19-02",
  "19-03",
  "19-04",

  "20-01",
  "20-02",
  "20-03",

  "21-01",

  "22-01",
  "22-02",
  "22-04",
  "22-05",
  "22-06",
  "22-07",

  "23-01",
  "23-02",

  "24-01",
  "24-02",
  "24-04",
  "24-06",
  "24-08",
  "24-09",
];

// See: https://scsa.org/classification
// Peak Times in SCSA typically change every 2 to 3 years, and new classifiers have not been added
// since the late 2000s.
export const ScsaPeakTimesMap = {
  //      SC-101  SC-102 SC-103 SC-104 SC-105 SC-106 SC-107 SC-108
  ISR: [13.5, 12, 10.5, 15.75, 13, 14.25, 14, 11],
  LTD: [12.5, 9.5, 9.5, 13.5, 10.5, 12.5, 12.5, 9.5],
  OSR: [12.25, 10.5, 10, 14.25, 12.75, 13.5, 12.75, 10.5],
  RFPI: [10.5, 9, 8, 13, 9.25, 11, 11, 8.25],
  RFPO: [8.75, 7.5, 7, 11.5, 8.5, 9.5, 10, 7.5],
  RFRI: [9.75, 7.5, 7.5, 12, 9, 9.75, 10, 7.5],
  RFRO: [9.5, 7, 7, 10.75, 8.5, 9, 9, 7],
  PROD: [13, 10, 10, 14, 11.5, 13, 13, 10],
  OPN: [11.25, 9.5, 8.5, 12.5, 10.5, 11.25, 11.5, 8.5],
  SS: [13.25, 10.5, 10.25, 14.75, 11.75, 13.5, 13.5, 10.5],
  CO: [12.5, 9.75, 10, 13.75, 11, 12.75, 13, 9.75],
  PCCO: [9.5, 7, 7, 11.25, 8.75, 9, 9.5, 7.5],
  PCCI: [10.75, 8.5, 7.75, 12.25, 9.5, 10.5, 11, 8],
};

type SCSADivisionNoPrefix = keyof typeof ScsaPeakTimesMap;
export type SCSADivision =
  | "scsa_isr"
  | "scsa_ltd"
  | "scsa_osr"
  | "scsa_rfpi"
  | "scsa_rfpo"
  | "scsa_rfri"
  | "scsa_rfro"
  | "scsa_prod"
  | "scsa_opn"
  | "scsa_ss"
  | "scsa_co"
  | "scsa_pcco"
  | "scsa_pcci";

export const scsaDivisionWithPrefix = (
  scsaDivision: SCSADivisionNoPrefix,
): SCSADivision => `scsa_${scsaDivision.toLowerCase()}` as SCSADivision;

export const scsaDivisions: SCSADivision[] = Object.keys(ScsaPeakTimesMap).map(noPrefix =>
  scsaDivisionWithPrefix(noPrefix as SCSADivisionNoPrefix),
);

const scsaDivisionToNoPrefix = (division: SCSADivision): SCSADivisionNoPrefix =>
  division.replace("scsa_", "").toUpperCase() as SCSADivisionNoPrefix;

export const ScsaPointsPerString = 25;

export const scsaHhfEquivalentForDivision = (division: SCSADivision): HHFJSON[] =>
  ScsaPeakTimesMap[scsaDivisionToNoPrefix(division)].map(
    (divisionStageTotalPeakTime, idx) => {
      // SC-104 Outer Limits, at idx 3, has 3 scoring strings instead of 4;
      const numberOfScoringStringsForClassifier = idx === 3 ? 3 : 4;
      return {
        classifier: `SC-${100 + idx + 1}`,
        id: `SC-${100 + idx + 1}`,
        // Numerator
        hhf: parseFloat(
          String(
            ScsaPointsPerString /
              (divisionStageTotalPeakTime / numberOfScoringStringsForClassifier),
          ),
        ).toFixed(4),
      };
    },
  );

export const scsaPeakTime = (
  scsaDivision: SCSADivisionNoPrefix,
  scsaClassifierCode: string,
) =>
  // Indexing scheme based on the fact that the division peak times in the above structure are sorted in ascending order.
  ScsaPeakTimesMap[scsaDivision][parseInt(scsaClassifierCode.substr(3, 4)) - 101];

export const normalizeClassifierCode = (psClassifierCode: string) => {
  if (!psClassifierCode) {
    return psClassifierCode;
  }

  // remove CM prefix if present
  return psClassifierCode.replace(/^CM\s+/gi, "").trim();
};
