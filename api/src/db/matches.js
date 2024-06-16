import mongoose from "mongoose";

const MatchesSchema = new mongoose.Schema(
  {
    updated: Date,
    created: Date,
    id: { type: Number, required: true, unique: true },
    name: String,
    uuid: { type: String, required: true, unique: true },
    date: String, // match_date string as-is e.g. 2024-01-01

    fetched: Date,
    uploaded: Date,
  },
  { strict: false }
);
MatchesSchema.index({ id: -1 });
MatchesSchema.index({ fetched: 1, uploaded: 1 });
export const Matches = mongoose.model("Matches", MatchesSchema);

const MATCHES_PER_FETCH = 1000;
const _idRange = (fromId) =>
  encodeURIComponent(`id: ${fromId + 1} TO ${fromId + MATCHES_PER_FETCH + 1}`);
const fetchMatchesRange = async (fromId, template = "USPSA") => {
  console.log("fetching from " + fromId);
  const {
    results: [{ hits }],
  } = await (
    await fetch(process.env.ALGOLIA_URL, {
      body: JSON.stringify({
        requests: [
          {
            indexName: "postmatches",
            params: `hitsPerPage=${MATCHES_PER_FETCH}&query=&numericFilters=${_idRange(
              fromId
            )}&facetFilters=templateName:${template}`,
          },
        ],
      }),
      method: "POST",
    })
  ).json();

  return hits.map((h) => ({
    updated: new Date(h.updated + "Z"),
    created: new Date(h.created + "Z"),
    id: h.id,
    name: h.match_name,
    uuid: h.match_id,
    date: h.match_date,
  }));
  //.sort((a, b) => b.id - a.id);
};

/**
 * @param startId match id to start with, defaults to 220k, somewhere around May 2024,
 * which was before the USPSA Import Loss.
 */
const fetchMoreMatches = async (startId = 220000, template, onPageCallback) => {
  let resultsCount = 0;

  let lastResults = [];
  let curId = startId;
  do {
    lastResults = await fetchMatchesRange(curId, template);
    curId = lastResults[0]?.id || Number.MAX_SAFE_INTEGER;

    resultsCount += lastResults.length;
    await onPageCallback(lastResults);
  } while (lastResults.length > 0);

  return resultsCount;
};

export const fetchAndSaveMoreUSPSAMatches = async () => {
  const lastMatch = await Matches.findOne().sort({ id: -1 });
  await fetchMoreMatches(lastMatch?.id, "USPSA", async (matches) => {
    await Matches.bulkWrite(
      matches.map((m) => ({
        updateOne: {
          filter: {
            id: m.id,
          },
          update: { $set: s },
          upsert: true,
        },
      }))
    );
  });
};
