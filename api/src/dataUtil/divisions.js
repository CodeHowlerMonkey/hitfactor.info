import divisions from "../../../data/division.json" assert { type: "json" };

/** ["opn", "ltd", "l10", "prod", "rev", "ss", "co", "lo", "pcc"] */
export const divShortNames = divisions.divisions.map((c) => c.short_name.toLowerCase());

export const mapDivisions = (mapper) =>
  Object.fromEntries(divShortNames.map((div) => [div, mapper(div)]));

export const mapDivisionsFlat = (mapper) => divShortNames.map((div) => mapper(div));

export const mapDivisionsAsync = async (mapper) =>
  Object.fromEntries(
    await Promise.all(divShortNames.map(async (div) => [div, await mapper(div)]))
  );

export const forEachDivisionSeq = async (cb) => {
  for (const division of divShortNames) {
    await cb(division);
  }
};

/** {opn: 2, ltd: 3, l10: 4, ... } */
export const divShortToId = divisions.divisions.reduce(
  (result, cur) => ({ ...result, [cur.short_name.toLowerCase()]: cur.id }),
  {}
);

export const divShortToLong = divisions.divisions.reduce(
  (result, cur) => ({
    ...result,
    [cur.short_name.toLowerCase()]: cur.long_name,
  }),
  {}
);

export const divIdToShort = Object.fromEntries(
  Object.entries(divShortToId).map((flip) => [flip[1], flip[0]])
);
