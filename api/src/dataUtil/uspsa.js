import { loadJSON } from "../utils.js";
const fallbackData = loadJSON("../../data/meta/all.json");

const fieldNameMap = {
  USPSA: "memberNumber",
  PersonNumber: "memberId",
  Expires: "expires",
  CARRYOPTICS: "co",
  LIMITED10: "l10",
  LIMITEDOPTICS: "lo",
  LIMITED: "ltd",
  OPEN: "opn",
  PCC: "pcc",
  PRODUCTION: "prod",
  REVOLVER: "rev",
  SINGLESTACK: "ss",
};

const _fetchPSClassUpdates = async () => {
  const response = await fetch(
    "https://uspsa.org/practiscore/practiscore_class_update.txt"
  );
  const text = await response.text();
  const lines = text.split("\n");
  const fieldsLine = lines.find((line) => line.startsWith("$FIELDS"));
  if (!fieldsLine) {
    return fallbackData;
  }
  const fields = fieldsLine.split("$FIELDS ").filter(Boolean)[0].split(",");
  const shooterLines = lines.filter((line) => !line.startsWith("$"));
  return shooterLines.map((line) =>
    Object.fromEntries(
      line.split(",").map((value, index) => [fieldNameMap[fields[index]], value])
    )
  );
};

const _psClassUpdatesByMemberNumber = async () => {
  let shooterObjects = fallbackData;
  try {
    shooterObjects = await _fetchPSClassUpdates();
  } catch (e) {
    console.log("fallback crash");
  }

  return shooterObjects.reduce((acc, curShooter) => {
    acc[curShooter.memberNumber] = curShooter;
    return acc;
  }, {});
};

const fourHours = 4 * 60 * 60_000;
let _cachedData = null;
let _cacheTime = new Date().getTime();
export const psClassUpdatesByMemberNumber = async () => {
  if (!_cachedData || new Date() - _cacheTime >= fourHours) {
    const newData = await _psClassUpdatesByMemberNumber();
    _cachedData = newData || _cachedData;
    _cacheTime = new Date();
  }

  return _cachedData;
};
