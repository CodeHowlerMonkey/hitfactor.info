import divisions from "../../../data/division.json" assert { type: "json" };

/** ["opn", "ltd", "l10", "prod", "rev", "ss", "co", "lo", "pcc"] */
export const divShortNames = divisions.divisions.map((c) =>
  c.short_name.toLowerCase()
);

export const mapDivisions = (mapper) =>
  Object.fromEntries(divShortNames.map((div) => [div, mapper(div)]));

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
