/* eslint-disable no-console */
import mongoose from "mongoose";

export interface Match {
  updated: Date;
  created: Date;
  uuid: string;
  id: number;
  name: string;

  type: string;
  subType: string;
  templateName: string;

  /* match_date string as-is e.g. "2024-01-01" */
  date: string;
  fetched?: Date;
  uploaded?: Date;
}

interface AlgoliaMatchNumericFilters {
  timestamp_utc_updated: number;
}
export interface AlgoliaMatch {
  id: number;
  created: string; // iso string without z
  updated: string; // iso string without z

  // club shit / address strings
  club_id: string; //number inside of a string
  front_club_city: string;
  front_club_country: string;
  front_club_county_no_r: string;
  front_club_id: number;
  front_club_state: string;

  // concat these 2 for full street address
  front_club_street: string;
  front_club_street_number: string;

  // urls
  front_club_url_slug: string;
  front_match_slug: string;

  front_match_id: number;
  match_date: string; // '2024-01-01' format
  match_id: string; // uuid-string, aka upload
  match_name: string;
  match_subtype: string;
  match_type: string; // uspsa_p
  objectID: string;
  ps_club_code: number;
  templateName: string; // "Hit Factor", 'USPSA', etc
  timestamp_utc_updated: number; // 1737840000
  version: string; // "2.0"
}

export interface MatchDef {
  match_id: string;
  match_name: string;
  match_type: string;
  match_subtype: string;
  match_creationdate: string;
  match_modifieddate: string;
  match_date: string; // 2024-12-31 format
  templateName: string;
}

const MatchesSchema = new mongoose.Schema<Match>(
  {
    updated: Date,
    created: Date,
    id: { type: Number, required: true, unique: true },
    name: String,

    type: String,
    subType: String,
    templateName: String,

    uuid: { type: String, required: true, unique: true },
    date: String,

    fetched: Date,
    uploaded: Date,
  },
  { strict: false },
);
MatchesSchema.index({ id: -1 });
MatchesSchema.index({ fetched: 1, uploaded: 1 });
MatchesSchema.index({ updated: 1, uploaded: 1 });
MatchesSchema.index({ updated: 1 });
MatchesSchema.index({ fetched: 1 });
MatchesSchema.virtual("scoresCount", {
  ref: "Scores",
  localField: "uuid",
  foreignField: "upload",
  count: true,
});
export const Matches = mongoose.model("Matches", MatchesSchema);

const MATCHES_PER_FETCH = 1000;
const _idRange = fromId =>
  encodeURIComponent(`id: ${fromId + 1} TO ${fromId + MATCHES_PER_FETCH + 1}`);

const fetchMatchesRange = async (
  fromId,
): Promise<(Match & AlgoliaMatchNumericFilters)[]> => {
  console.log(`fetching from ${fromId}`);
  const {
    results: [{ hits }],
  } = await (
    await fetch(process.env.ALGOLIA_URL!, {
      body: JSON.stringify({
        requests: [
          {
            indexName: "postmatches",
            params: `hitsPerPage=${MATCHES_PER_FETCH}&query=&numericFilters=${_idRange(
              fromId,
            )}`,
          },
        ],
      }),
      method: "POST",
    })
  ).json();

  return hits.map(h => ({
    updated: new Date(`${h.updated}Z`),
    created: new Date(`${h.created}Z`),
    id: h.id,
    name: h.match_name,
    uuid: h.match_id,
    date: h.match_date,
    timestamp_utc_updated: h.timestamp_utc_updated,
    type: h.match_type,
    subType: h.match_subtype,
    templateName: h.templateName,
  }));
};

export const matchFromMatchDef = (
  h: MatchDef,
  forcedTemplateName?: string,
): Match & AlgoliaMatchNumericFilters => {
  if (!h) {
    return h;
  }
  const updated = new Date(`${h.match_modifieddate}Z`);
  return {
    updated,
    created: new Date(`${h.match_creationdate}Z`),
    id: Number.parseInt(h.match_id.split("-").reverse()[0], 16),
    name: h.match_name,
    uuid: h.match_id,
    date: h.match_date,
    timestamp_utc_updated: updated.getTime(),
    type: h.match_type,
    subType: h.match_subtype,
    templateName: forcedTemplateName || h.templateName,
  };
};

const fetchMatchesRangeByTimestamp = async (
  latestTimestamp: number,
): Promise<(Match & AlgoliaMatchNumericFilters)[]> => {
  console.log(`fetching up until ${latestTimestamp}`);
  const {
    results: [{ hits }],
  } = await (
    await fetch(process.env.ALGOLIA_URL!, {
      body: JSON.stringify({
        requests: [
          {
            indexName: "postmatches",
            params: `hitsPerPage=${MATCHES_PER_FETCH}&query=&numericFilters=${encodeURIComponent(
              `timestamp_utc_updated < ${latestTimestamp}`,
            )}`,
          },
        ],
      }),
      method: "POST",
    })
  ).json();

  return hits.map(h => ({
    updated: new Date(`${h.updated}Z`),
    created: new Date(`${h.created}Z`),
    id: h.id,
    name: h.match_name,
    uuid: h.match_id,
    date: h.match_date,
    timestamp_utc_updated: h.timestamp_utc_updated,
  }));
};

/**
 * @param startId match id to start with, defaults to 220k, somewhere around May 2024,
 * which was before the USPSA Import Loss.
 */
const fetchMoreMatches = async (startId = 220000, onPageCallback) => {
  let resultsCount = 0;

  let lastResults: Match[] = [];
  let curId = startId;
  do {
    lastResults = (await fetchMatchesRange(curId)).sort((a, b) => b.id - a.id);
    process.stdout.write(".");

    curId = lastResults[0]?.id || Number.MAX_SAFE_INTEGER;

    resultsCount += lastResults.length;
    await onPageCallback(lastResults);
  } while (lastResults.length > 0);

  return resultsCount;
};

/**
 * @param startDate match updated date to start with
 */
export const fetchMoreMatchesByTimestamp = async (startTimestamp, onPageCallback) => {
  let resultsCount = 0;

  let lastFetchResults: (Match & AlgoliaMatchNumericFilters)[] = [];
  let curTimestamp = 8640_000_000_000_000 / 1000; // max valid js date / 1000 (for algolia, which uses seconds timestamps)
  do {
    lastFetchResults = (await fetchMatchesRangeByTimestamp(curTimestamp)).sort(
      (a, b) => a.timestamp_utc_updated - b.timestamp_utc_updated,
    );
    process.stdout.write(".");
    const earliestFetchedTimestamp = lastFetchResults[0]?.timestamp_utc_updated;
    curTimestamp = earliestFetchedTimestamp || startTimestamp + 1;

    const lastInTheTimeWindowResults = lastFetchResults.filter(
      c => c.timestamp_utc_updated >= startTimestamp,
    );
    resultsCount += lastInTheTimeWindowResults.length;
    await onPageCallback(lastInTheTimeWindowResults);
  } while (curTimestamp > startTimestamp && lastFetchResults.length > 0);

  return resultsCount;
};

/**
 * Fetch loop by id, won't produce updates, since id stays the same, and we're fetching
 * only ids that are higher than the highest one we already have in the database.
 *
 * Saves matches into Matches collecion, which is later used by upload loop.
 *
 * Use for initial fetch of matches, for day-to-day use fetchAndSaveMoreMatchesByUpdateDate
 */
export const fetchAndSaveMoreMatchesById = async () => {
  const lastMatch = await Matches.findOne().sort({ id: -1 });
  console.log(`lastMatchId = ${lastMatch?.id}`);
  return fetchMoreMatches(lastMatch?.id, async matches =>
    Matches.bulkWrite(
      matches.map(m => ({
        updateOne: {
          filter: {
            uuid: m.uuid,
          },
          update: { $set: m },
          upsert: true,
        },
      })),
    ),
  );
};

/**
 * Same as fetchAndSaveMoreMatchesById, but uses updated date.
 *
 * Should overwrite some matches if they were updated after previous fetch.
 */
export const fetchAndSaveMoreMatchesByUpdatedDate = async () => {
  const lastMatch = await Matches.findOne().sort({ updated: -1 });
  console.log(
    `lastUpdatedMatch= ${lastMatch?.updated?.toLocaleDateString?.("en-us", {
      timeZone: "UTC",
    })}`,
  );

  const now = new Date().getTime();
  const lastMatchUpdated = lastMatch?.updated?.getTime() || now;
  const validLastUpdated = lastMatchUpdated > now ? now : lastMatchUpdated;

  // add extra 48 hours window to account for wrong timeZone on upload tablets
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  return fetchMoreMatchesByTimestamp(
    Math.floor((validLastUpdated - TWO_DAYS_MS) / 1000),
    async matches =>
      Matches.bulkWrite(
        matches.map(m => ({
          updateOne: {
            filter: {
              uuid: m.uuid,
            },
            update: { $set: m },
            upsert: true,
          },
        })),
      ),
  );
};
