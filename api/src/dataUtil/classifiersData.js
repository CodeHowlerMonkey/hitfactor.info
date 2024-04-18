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
