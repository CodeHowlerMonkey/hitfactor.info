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
import { textSearchMatch } from "../../../db/utils.js";
import { classForPercent } from "../../../../../shared/utils/classification.js";

// TODO: refactor to aggregation and use addPlaceAndPercentileAggregation
// instead of JS logic, that is applied after filters
const buildShootersQuery = (params, query) => {
  const { division } = params;
  const { filter: filterString, inconsistencies: inconString, classFilter } = query;
  const shootersQuery = Shooter.where({
    division,
    reclassificationsCurPercentCurrent: { $gt: 0 },
  });

  if (classFilter) {
    shootersQuery.where({ class: classFilter });
  }

  if (filterString) {
    shootersQuery.where(textSearchMatch(["name", "memberNumber"], filterString));
  }

  if (inconString) {
    const [inconsistencies, inconsistenciesMode] = inconString?.split("-");
    const field = "$" + inconsistencies + "Rank";
    const operator = inconsistenciesMode === "paper" ? "$lt" : "$gt";
    shootersQuery.where({ $expr: { [operator]: [field, "$hqClassRank"] } });
  }

  return shootersQuery;
};

const shootersRoutes = async (fastify, opts) => {
  fastify.get("/:division", async (req, res) => {
    const { division } = req.params;
    const { sort, order, page: pageString } = req.query;

    const page = Number(pageString) || 1;

    const shootersTotalWithoutFilters = await Shooter.where({
      division,
      reclassificationsCurPercentCurrent: { $gt: 0 },
    }).countDocuments();

    const shootersQuery = buildShootersQuery(req.params, req.query);
    const skip = (page - 1) * PAGE_SIZE;
    shootersQuery.sort(multisortObj(sort?.split(","), order?.split(","))).skip(skip);

    const paginatedData = await shootersQuery.limit(PAGE_SIZE).lean().exec();
    const withIndex = paginatedData.map((shooter, index) => ({
      ...shooter,
      index: skip + index,
    }));

    const count = await buildShootersQuery(req.params, req.query).countDocuments().exec();

    return {
      shooters: withIndex,
      shootersTotal: count,
      shootersTotalWithoutFilters,
      shootersPage: page,
    };
  });

  fastify.get("/:division/:memberNumber", async (req, res) => {
    const { division, memberNumber } = req.params;
    const { sort, order, page: pageString } = req.query;

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
      })
    );

    const info = infos.find((s) => s.division === division);
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
    const shootersTable = await Shooter.find({
      division,
      current: { $gt: 0 },
      reclassificationsCurPercentCurrent: { $gt: 0 },
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
