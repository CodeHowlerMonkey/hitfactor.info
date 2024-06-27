import divisionsFromJson from "../../data/division.json" assert { type: "json" };

/** ["opn", "ltd", "l10", "prod", "rev", "ss", "co", "lo", "pcc"] */
export const divShortNames = divisionsFromJson.divisions.map((c) =>
  c.short_name.toLowerCase()
);

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
export const divShortToId = divisionsFromJson.divisions.reduce(
  (result, cur) => ({ ...result, [cur.short_name.toLowerCase()]: cur.id }),
  {}
);

export const divShortToLong = divisionsFromJson.divisions.reduce(
  (result, cur) => ({
    ...result,
    [cur.short_name.toLowerCase()]: cur.long_name,
  }),
  {}
);

export const divIdToShort = Object.fromEntries(
  Object.entries(divShortToId).map((flip) => [flip[1], flip[0]])
);

// TODO: add allDivisions for multisport, use uspsaDivisions for USPSA only
export const uspsaDivisions = divisionsFromJson.divisions;
export const divisions = divisionsFromJson;
export const hfuDivisions = [
  {
    long: "Competition",
    short: "comp", // src: opn, counts: opn
  },
  {
    long: "Optics",
    short: "opt", // src: loco, counts: loco
  },
  {
    long: "Irons",
    short: "irn", // src: ltd, counts: ltd, l10, prod, ss, rev
  },
  {
    long: "Carbine",
    short: "car",
  },
];

export const sportName = (code) =>
  ({ hfu: "Hit Factor", pcsl: "PCSL", uspsa: "USPSA" }[code] || "USPSA");

export const hfuDivisionCompatabilityMap = {
  // from USPSA
  opn: "comp",

  co: "opt",
  lo: "opt",

  ltd: "irn",
  l10: "irn",
  prod: "irn",
  ss: "irn",
  rev: "irn",

  pcc: "car",

  // from PCSL
  pcsl_comp: "comp",
  pcsl_po: "opt",
  pcsl_pi: "irn",
  pcsl_pcc: "car",
  pcsl_acp: "opt",
};

/**
 * All directions switch from sport to sport with selected division map.
 * User in DivisionNavigation
 *
 * Format: [newSport][oldDiv] = newDiv
 */
export const divisionChangeMap = {
  hfu: hfuDivisionCompatabilityMap,
  uspsa: {
    // from HFU
    comp: "opn",
    opt: "co",
    irn: "ltd",
    car: "pcc",

    // from PCSL
    pcsl_comp: "opn",
    pcsl_po: "co",
    pcsl_pi: "ltd",
    pcsl_pcc: "pcc",
    pcsl_acp: "co",
  },
};

export const minorDivisions = ["co", "lo", "prod", "pcc", "comp", "opt", "irn", "car"];
