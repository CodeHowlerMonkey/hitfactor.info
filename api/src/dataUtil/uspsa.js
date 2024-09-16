import { loadJSON } from "../utils.js";
import { fetchPSClassUpdates } from "../worker/classUpdate.js";
const fallbackData = loadJSON("../../data/meta/all.json");

const _psClassUpdatesByMemberNumber = async () => {
  let shooterObjects = fallbackData;
  try {
    shooterObjects = await fetchPSClassUpdates();
  } catch (e) {
    console.log("fallback crash");
  }

  return shooterObjects.reduce((acc, curShooter) => {
    acc[curShooter.memberNumber] = curShooter;
    return acc;
  }, {});
};

const fourDays = 4 * 24 * 60 * 60_000;
let _cachedData = null;
let _cacheTime = new Date().getTime();
export const psClassUpdatesByMemberNumber = async () => {
  if (!_cachedData || new Date() - _cacheTime >= fourDays) {
    const newData = await _psClassUpdatesByMemberNumber();
    _cachedData = newData || _cachedData;
    _cacheTime = new Date();
  }

  return _cachedData;
};
