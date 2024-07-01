import { loadJSON } from "../utils.js";

export const classifiers = loadJSON("../../data/classifiers/classifiers.json").classifiers;

export const classifiersByNumber = classifiers.reduce((acc, cur) => {
  acc[cur.classifier] = cur;
  return acc;
}, {});

export const basicInfoForClassifier = (c) => ({
  id: c?.id,
  code: c?.classifier,
  classifier: c?.classifier,
  name: c?.name,
  scoring: c?.scoring,
});

export const basicInfoForClassifierCode = (number) => {
  if (!number) {
    return {};
  }
  const c = classifiers.find((cur) => cur.classifier === number);
  if (!c) {
    return {};
  }
  return basicInfoForClassifier(c);
};

/** whitelist for wsb downloads */
export const classifierNumbers = classifiers.map((cur) => cur.classifier);

// See: https://scsa.org/classification
// Peak Times in SCSA typically change every 2 to 3 years, and new classifiers have not been added
// since the late 2000s.
export const ScsaPeakTimesMap = {
  //      SC-101  SC-102 SC-103 SC-104 SC-105 SC-106 SC-107 SC-108
  'ISR' : [13.5,  12,    10.5,  15.75, 13,    14.25, 14,    11  ],
  'LTD' : [12.5,  9.5,   9.5,   13.5,  10.5,  12.5,  12.5,  9.5 ],
  'OSR' : [12.25, 10.5,  10,    14.25, 12.75, 13.5,  12.75, 10.5],
  'RFPI': [10.5,  9,     8,     13,    9.25,  11,    11,    8.25],
  'RFPO': [8.75,	7.5,	 7,	    11.5,	 8.5,	  9.5,	 10,	  7.5 ],
  'RFRI': [9.75,	7.5,	 7.5,	  12,	   9,	    9.75,	 10,	  7.5 ],
  'RFRO': [9.5,	  7,	   7,	    10.75, 8.5,	  9,	   9,	    7   ],
  'PROD': [13,    10,    10,    14,    11.5,  13,    13,    10  ],
  'OPN' : [11.25,	9.5,	 8.5,	  12.5,	 10.5,	11.25, 11.5,	8.5 ],
  'SS'  : [13.25, 10.5,  10.25, 14.75, 11.75, 13.5,  13.5,  10.5],
  'CO'  : [12.5,  9.75,  10,    13.75, 11,    12.75, 13,    9.75],
  'PCCO': [9.5,	  7,	   7,	    11.25, 8.75,	9,	   9.5,	  7.5 ],
  'PCCI': [10.75,	8.5,	7.75,   12.25, 9.5,   10.5,  11,    8   ]
}

export const scsaDivisionWithPrefix = (scsaDivision) => `scsa:${scsaDivision.toLowerCase()}`;

export const scsaPeakTime = (scsaDivision, scsaClassifierCode) => {
  // Indexing scheme based on the fact that the division peak times in the above structure are sorted in ascending order.
  return ScsaPeakTimesMap[scsaDivision][parseInt(scsaClassifierCode.substr(3, 4))-101];
}
