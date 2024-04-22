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

export const addPlaceAndPercentileAggregation = (placeByField) => [
  { $sort: { [placeByField]: -1 } },
  { $group: { _id: 1, docs: { $push: "$$CURRENT" } } },
  { $addFields: { total: { $size: "$docs" } } },
  { $unwind: { path: "$docs", includeArrayIndex: "place" } },
  {
    $addFields: {
      "docs.place": { $add: ["$place", 1] },
      "docs.total": "$total",
      "docs.percentile": percentAggregationOp("$place", "$total", 2),
    },
  },
  { $replaceRoot: { newRoot: "$docs" } },
];

export const addTotalCountAggregation = (totalCountField) => [
  { $group: { _id: 1, docs: { $push: "$$CURRENT" } } },
  { $addFields: { total: { $size: "$docs" } } },
  { $unwind: { path: "$docs" } },
  { $addFields: { [`docs.${totalCountField}`]: "$total" } },
  { $replaceRoot: { newRoot: "$docs" } },
];

export const paginate = (page) => [
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
  $or: fields.map((f) => ({
    [f]: new RegExp(".*" + escapeRegExp(filterString) + ".*", "i"),
  })),
});
