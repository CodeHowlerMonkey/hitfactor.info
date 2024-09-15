import { basicInfoForClassifierCode } from "../../../dataUtil/classifiersData.js";
import {
  multisort,
  multisortObj,
  safeNumSort,
} from "../../../../../shared/utils/sort.js";
import { PAGE_SIZE } from "../../../../../shared/constants/pagination.js";
import {
  scoresForDivisionForShooter,
  shooterScoresChartData,
} from "../../../db/scores.js";
import { Shooter, reclassificationForProgressMode } from "../../../db/shooters.js";
import {
  addPlaceAndPercentileAggregation,
  addTotalCountAggregation,
  multiSortAndPaginate,
  textSearchMatch,
} from "../../../db/utils.js";
import { classForPercent } from "../../../../../shared/utils/classification.js";
import { sportForDivision } from "../../../dataUtil/divisions.js";

const DEFAULT_PLACE_BY = "reclassificationsRecPercentCurrent";
const placeByFieldForSort = (sort) => {
  if (sort && ["current", "reclassificationsCurPercentCurrent"].includes(sort)) {
    return sort;
  }

  return DEFAULT_PLACE_BY;
};

const _inconsistencyFilter = (inconString) => {
  if (!inconString) {
    return [];
  }

  const [inconsistencies, inconsistenciesMode] = inconString?.split("-");
  const field = "$" + inconsistencies + "Rank";
  const operator = inconsistenciesMode === "paper" ? "$lt" : "$gt";
  return [{ $match: { $expr: { [operator]: [field, "$hqClassRank"] } } }];
};

const shootersQueryAggregation = (params, query) => {
  const { division } = params;
  const {
    filter: filterString,
    inconsistencies: inconString,
    classFilter,
    sort,
    order,
    page,
  } = query;

  const placeByField = placeByFieldForSort(sort);

  return Shooter.aggregate([
    // default match
    {
      $project: {
        _id: false,
        _v: false,
      },
    },
    {
      $match: {
        division,
        [placeByField]: { $gt: 0 },
      },
    },

    // filters
    ...addPlaceAndPercentileAggregation(placeByField),
    ...(!classFilter ? [] : [{ $match: { class: classFilter } }]),
    ...(!filterString
      ? []
      : [{ $match: textSearchMatch(["memberNumber", "name"], filterString) }]),
    ..._inconsistencyFilter(inconString),

    // meta
    ...addTotalCountAggregation("totalWithFilters"),
    ...multiSortAndPaginate({ sort, order, page }),
  ]);
};

const shootersRoutes = async (fastify, opts) => {
  fastify.get("/:division", async (req, res) => {
    const shooters = await shootersQueryAggregation(req.params, req.query);

    return {
      shooters,
      shootersTotal: shooters[0]?.total || 0,
      shootersTotalWithoutFilters: shooters[0]?.totalWithoutFilters || 0,
      shootersPage: Number(req.query.page) || 1,
    };
  });

  fastify.get("/:division/:memberNumber", async (req, res) => {
    const { division, memberNumber } = req.params;
    const { sort, order } = req.query;

    const [infos, scoresData] = await Promise.all([
      Shooter.find({ memberNumber }).limit(0).lean(),
      scoresForDivisionForShooter({
        division,
        memberNumber,
      }),
    ]);

    const data = multisort(scoresData, sort?.split?.(","), order?.split?.(",")).map(
      (c) => ({
        ...c,
        classifierInfo: basicInfoForClassifierCode(c?.classifier),
        hf: division.startsWith('scsa') ? Number(c.stageTimeSecs) : c.hf
      })
    );

    const info = infos.find((s) => s.division === division) || {};
    info.classificationByDivision = infos.reduce((acc, cur) => {
      const {
        reclassificationsCurPercentCurrent: curHHFCurrent,
        reclassificationsRecPercentCurrent: recCurrent,
      } = cur;

      acc[cur.division] = {
        hqClass: cur.hqClass,
        current: cur.current,
        reclassificationsCurPercentClass: classForPercent(curHHFCurrent || 0),
        reclassificationsCurPercentCurrent: curHHFCurrent || 0,
        reclassificationsRecPercentClass: classForPercent(recCurrent || 0),
        reclassificationsRecPercentCurrent: recCurrent || 0,
        age: cur.age,
        age1: cur.age1,
      };
      return acc;
    }, {});
    delete info.reclassifications;
    delete info.classes;
    delete info.currents;
    delete info.ages;
    delete info.age1s;

    return {
      info: info || {},
      classifiers: data,
    };
  });

  fastify.get("/:division/:memberNumber/chart", async (req, res) => {
    const { division, memberNumber } = req.params;
    return await shooterScoresChartData({ division, memberNumber });
  });

  fastify.get("/:division/:memberNumber/chart/progress/:mode", async (req, res) => {
    const { division, memberNumber, mode } = req.params;
    const reclass = await reclassificationForProgressMode(mode, memberNumber);
    return reclass?.[division]?.percentWithDates || [];
  });

  fastify.get("/:division/chart", async (req, res) => {
    const { division } = req.params;
    const sport = sportForDivision(division);
    const shootersTable = await Shooter.find({
      division,
      ...(sport !== "hfu" ? { current: { $gt: 0 } } : {}),
      reclassificationsRecPercentCurrent: { $gt: 0 },
    })
      .select([
        "current",
        "reclassificationsCurPercentCurrent",
        "reclassificationsRecPercentCurrent",
        "memberNumber",
      ])
      .lean()
      .limit(0);

    return shootersTable
      .map((c) => ({
        curPercent: c.current,
        curHHFPercent: c.reclassificationsCurPercentCurrent,
        recPercent: c.reclassificationsRecPercentCurrent,
        memberNumber: c.memberNumber,
      }))
      .sort(safeNumSort("curPercent"))
      .map((c, i, all) => ({
        ...c,
        curPercentPercentile: (100 * i) / (all.length - 1),
      }))
      .sort(safeNumSort("curHHFPercent"))
      .map((c, i, all) => ({
        ...c,
        curHHFPercentPercentile: (100 * i) / (all.length - 1),
      }))
      .sort(safeNumSort("recPercent"))
      .map((c, i, all) => ({
        ...c,
        recPercentPercentile: (100 * i) / (all.length - 1),
      }));
  });
};

export default shootersRoutes;
