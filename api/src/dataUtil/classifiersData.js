import { loadJSON } from "../utils.js";

export const classifiers = loadJSON(
  "../../data/classifiers/classifiers.json"
).classifiers;

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
];
