import stateNames from "@data/states";

const specialNats = ["Single Stack Classic", "BITB VIII", "Western States Single Stack"];
const specialAreas = [
  "2019 Magnus Sports Cup",
  "Midwest PCC Championship",
  "Southwestern PCC Championship",
  "2016 WSSSC", //< Western States Single-Stack Championship

  // GFDS final matches
  "Go Fast Don’t Suck",
  "Final GFDS 2021",
  "GFDS USPSA POSTAL MATCH - FINAL",
];
const specialMajors = [
  "Red Rock Rumble",
  "Golden Bullet",
  "Double Tap",
  "Dragons Cup",
  "Dragon's Cup",
  "Roadrunner Shootout",
  "Bluegrass",
  "Space City",
  "GridIron",
  "Staten Island",
  "North Coast",
  "Gulf Coast",
  "Cornhusker Classic",
  "Henrys Cup",
  "Henry's Cup",
  "SNS Casting 400 USPSA Championship",
  "SnS 400",
  "Harris Aim For The Coast",
  'Gary "Doc" Welt Memorial Match',
  "Ozarks Classic",
  "2016 Swamp Challenge",

  // Anything with "Championship" in it is at least level 2, if eligible
  "championship",
];

const matchesAny = (name: string, names: string[]) =>
  names.some(n => name.match(new RegExp(n, "i")));

export const matchLevel = (name: string) => {
  if (name.match(/national|world/i) || matchesAny(name, specialNats)) {
    return 4;
  } else if (name.match(/area [1-8]/i) || matchesAny(name, specialAreas)) {
    return 3;
  } else if (
    name.match(/\bstate\b|\bsection/i) ||
    (name.match(/classic|open|challenge/i) &&
      matchesAny(
        name,
        stateNames.map(s => s.split(" ").pop()!), // only match last part of the state (Virginias, Carolinas, etc)
      )) ||
    matchesAny(name, specialMajors)
  ) {
    return 2;
  }
  return 1;
};
