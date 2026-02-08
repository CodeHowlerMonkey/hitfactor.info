export const fieldModeMap = {
  Classifiers: "classifiers",
  Majors: "majors",
  ...(location.hostname === "localhost"
    ? {
        HQ: "current",
        HQHigh: "high",
      }
    : {}),
  Recommended: "recPercentUncapped",
  "Recommended High": "recPercentUncappedHigh",
};

export const eloFieldModeMap = {
  ELO: "elo",
  ...fieldModeMap,
};

export const fieldForMode = mode => eloFieldModeMap[mode];
export const eloModes = Object.keys(eloFieldModeMap);
export const modes = Object.keys(fieldModeMap);
export const ageModeMap = {
  All: "",
  "Post MegaDoc": "postMegaDoc",
  "Pre MegaDoc": "preMegaDoc",
};
export const ageModes = Object.keys(ageModeMap);
export const ageModeParam = (ageMode: string) => {
  const value = ageModeMap[ageMode];
  if (value) {
    return `&age=${value}`;
  }

  return "";
};
