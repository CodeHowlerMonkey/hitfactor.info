import { loadJSON } from "../utils";
import { fetchPSClassUpdates } from "../worker/classUpdate";
const fallbackData = loadJSON("../../data/meta/all.json");

// TODO: #77 kill this interface, just use ActiveMembers DB collection, select latest class update
export interface PSClassUpdateAllJSON {
  memberNumber: string;
  memberId: string;

  expires: Date;

  co: string;
  l10: string;
  lo: string;
  ltd: string;
  opn: string;
  pcc: string;
  prod: string;
  rev: string;
  ss: string;
}

const _psClassUpdatesByMemberNumber = async () => {
  let shooterObjects = fallbackData;
  try {
    shooterObjects = await fetchPSClassUpdates();
  } catch (e) {
    console.error("fallback crash");
  }

  return shooterObjects.reduce(
    (acc: Record<string, PSClassUpdateAllJSON>, curShooter: PSClassUpdateAllJSON) => {
      acc[curShooter.memberNumber] = curShooter;
      return acc;
    },
    {} as Record<string, PSClassUpdateAllJSON>,
  );
};

const fourDays = 4 * 24 * 60 * 60_000;
let _cachedData: Record<string, PSClassUpdateAllJSON> | null = null;
let _cacheTime = new Date().getTime();
export const psClassUpdatesByMemberNumber = async (): Promise<
  Record<string, PSClassUpdateAllJSON>
> => {
  if (!_cachedData || new Date().getTime() - _cacheTime >= fourDays) {
    const newData = await _psClassUpdatesByMemberNumber();
    _cachedData = newData || _cachedData;
    _cacheTime = new Date().getTime();
  }

  return _cachedData!;
};
