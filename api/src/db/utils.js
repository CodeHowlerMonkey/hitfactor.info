import { PAGE_SIZE } from "../../../shared/constants/pagination.js";
import { multisortObj } from "../../../shared/utils/sort.js";
import { escapeRegExp } from "../utils.js";

export const percentAggregationOp = (value, total, round = 2) => ({
  $round: [
    {
      $multiply: [{ $divide: [value, total] }, 100],
    },
    round,
  ],
});

/**
 * Final step aggregation for classifier runs and shooters.
 * Accepts other final aggregations as it's param, in order to avoid OOM query errors in mongo.
 *
 * Sorts by placeByField, and calculates extra fields for each doc returned by the query:
 *  - "place" - index + 1 in current sort mode, before applying filtersAggregation or paginationAggregation
 *  - "total" - total number of docs before applying filtersAggregation,
 *  - "totalWithFilters" - total number of docs after aplying filtersAggregation, but before paginationAggregation
 *  - "percentile" - percentile, determined by "place" and "total" fields
 *
 * @param {string} placeByField  - field to pre-sort and determine place by
 * @param {array} filtersAggregation - aggregation that applies filters
 * @param {*} paginationAggregation - final aggregation that applies sort, skip(page) and limit at the end of aggregation
 * @returns {array} aggregation array, that should be spread at the end of Collection.aggregate() arg
 */
export const addPlaceAndPercentileAggregation = (
  placeByField,
  filtersAggregation,
  paginationAggregation
) => [
  {
    $facet: {
      docs: [
        { $sort: { [placeByField]: -1 } },
        ...filtersAggregation,
        ...paginationAggregation,
      ],
      meta: [{ $count: "total" }],
      metaWithFilters: [...filtersAggregation, { $count: "total" }],
    },
  },
  { $unwind: "$meta" },
  { $unwind: "$metaWithFilters" },
  { $unwind: { path: "$docs", includeArrayIndex: "place" } },
  {
    $addFields: {
      "docs.total": "$meta.total",
      "docs.totalWithFilters": "$metaWithFilters.total",
      "docs.place": "$place",
    },
  },
  { $replaceRoot: { newRoot: "$docs" } },
  {
    $addFields: {
      percentile: percentAggregationOp("$place", "$total", 2),
    },
  },
];

export const paginate = page => [
  { $skip: ((Number(page) || 1) - 1) * PAGE_SIZE },
  { $limit: PAGE_SIZE },
];

export const multiSortAndPaginate = ({ sort, order, page }) => [
  ...(!sort?.length
    ? []
    : [{ $sort: multisortObj(sort?.split(","), order?.split(",")) }]),
  ...paginate(page),
];

// 🤌🤌🤌
export const textSearchMatch = (fields, filterString) => ({
  $or: fields.map(f => ({
    [f]: new RegExp(".*" + escapeRegExp(filterString) + ".*", "i"),
  })),
});

/** reimplements $getField aggregation operator that works in 7.0
 * (we need this because mongo doens't publish 7.x releases for docker/apt)
 */
export const getField = ({ input, field }) => ({
  $getField: {
    input: {
      $arrayElemAt: [
        {
          $filter: {
            input,
            cond: {
              $eq: ["$$this.k", field],
            },
          },
        },
        0,
      ],
    },
    field: "v",
  },
});
