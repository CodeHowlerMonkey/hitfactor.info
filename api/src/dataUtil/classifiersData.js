import { loadJSON } from "../utils.js";

export const classifiers = loadJSON(
  "../../data/classifiers/classifiers.json"
).classifiers;

export const basicInfoForClassifier = (c) => ({
  id: c.id,
  code: c.classifier,
  name: c.name,
  scoring: c.scoring,
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
