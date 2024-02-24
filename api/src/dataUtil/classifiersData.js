import classifiersData from "../../../data/classifiers/classifiers.json" assert { type: "json" };

export const classifiers = classifiersData.classifiers;

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
  const c = classifiersData.classifiers.find(
    (cur) => cur.classifier === number
  );
  if (!c) {
    return {};
  }
  return basicInfoForClassifier(c);
};

/** whitelist for wsb downloads */
export const classifierNumbers = classifiers.map((cur) => cur.classifier);
