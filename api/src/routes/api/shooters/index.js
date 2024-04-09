import { basicInfoForClassifierCode } from "../../../dataUtil/classifiersData.js";
import {
  classLetterSort,
  multisort,
  multisortObj,
  safeNumSort,
} from "../../../../../shared/utils/sort.js";
import { PAGE_SIZE } from "../../../../../shared/constants/pagination.js";
import {
  scoresForDivisionForShooter,
  shooterScoresChartData,
} from "../../../db/scores.js";
import {
  Shooter,
  shootersExtendedInfoForDivision,
} from "../../../db/shooters.js";
const buildShootersQuery = (params, query, initial) => {
  const { division } = params;
  const {
    filter: filterString,
    inconsistencies: inconString,
    classFilter,
  } = query;
  const shootersQuery = (initial || Shooter).where({
    division,
    reclassificationsCurPercentCurrent: { $gt: 0 },
  });
  if (classFilter) {
    shootersQuery.where({ class: classFilter });
  }
  if (filterString) {
    shootersQuery.where({
      $or: [
        { name: { $text: { $search: filterString } } },
        { memberNumber: { $text: { $search: filterString } } },
      ],
    });
  }

  // TODO: Special filter and sort for inconsistencies table
  if (inconString) {
    const [inconsistencies, inconsistenciesMode] = inconString?.split("-");
    data = data.filter((shooter) => {
      const order = classLetterSort(
        shooter.hqClass,
        shooter[inconsistencies],
        undefined,
        1
      );
      if (inconsistenciesMode === "paper") {
        return order > 0;
      } else {
        return order < 0;
      }
    });
  }
  return shootersQuery;
};

const shootersRoutes = async (fastify, opts) => {
  fastify.get("/download/:division", async (req, res) => {
    const { division } = req.params;

    res.header(
      "Content-Disposition",
      `attachment; filename=shooters.${division}.json`
    );
    return shootersExtendedInfoForDivision({ division });
  });
  fastify.get("/:division", async (req, res) => {
    const { division } = req.params;
    const {
      sort,
      order,
      page: pageString,
      filter: filterString,
      inconsistencies: inconString,
      classFilter,
    } = req.query;

    const page = Number(pageString) || 1;

    const shootersTotalWithoutFilters = await Shooter.countDocuments({
      division,
      reclassificationsCurPercentCurrent: { $gt: 0 },
    });

    const shootersQuery = buildShootersQuery(req.params, req.query);
    const skip = (page - 1) * PAGE_SIZE;
    shootersQuery
      .sort(multisortObj(sort?.split(","), order?.split(",")))
      .skip(skip);

    const paginatedData = await shootersQuery.limit(PAGE_SIZE).lean().exec();
    const withIndex = paginatedData.map((shooter, index) => ({
      ...shooter,
      index: skip + index,
    }));

    const count = await buildShootersQuery(
      req.params,
      req.query,
      Shooter.countDocuments({})
    ).exec();

    return {
      shooters: withIndex,
      shootersTotal: count,
      shootersTotalWithoutFilters,
      shootersPage: page,
    };
  });

  fastify.get("/download/:division/:memberNumber", async (req, res) => {
    const { division, memberNumber } = req.params;

    const [info, scoresData] = await Promise.all([
      shootersExtendedInfoForDivision({ division, memberNumber }),
      scoresForDivisionForShooter({
        division,
        memberNumber,
      }),
    ]);

    const data = scoresData.map((c) => ({
      ...c,
      classifierInfo: basicInfoForClassifierCode(c?.classifier),
    }));

    res.header(
      "Content-Disposition",
      `attachment; filename=shooters.${division}.${memberNumber}.json`
    );

    return {
      info: info?.[0] || {},
      classifiers: data,
    };
  });
  fastify.get("/:division/:memberNumber", async (req, res) => {
    const { division, memberNumber } = req.params;
    const { sort, order, page: pageString } = req.query;

    const [info, scoresData] = await Promise.all([
      shootersExtendedInfoForDivision({ division, memberNumber }),
      scoresForDivisionForShooter({
        division,
        memberNumber,
      }),
    ]);

    const data = multisort(
      scoresData,
      sort?.split?.(","),
      order?.split?.(",")
    ).map((c) => ({
      ...c,
      classifierInfo: basicInfoForClassifierCode(c?.classifier),
    }));

    return {
      info: info?.[0] || {},
      classifiers: data,
    };
  });

  fastify.get("/:division/:memberNumber/chart", async (req, res) => {
    const { division, memberNumber } = req.params;
    return await shooterScoresChartData({ division, memberNumber });
  });

  fastify.get("/:division/chart", async (req, res) => {
    const { division } = req.params;
    const shootersTable = await Shooter.find({
      [`current.${division}`]: { $gt: 0 },
      [`reclassificationsByCurPercent.${division}.percent`]: { $gt: 0 },
    })
      .select([
        `current.${division}`,
        `reclassificationsByCurPercent.${division}.percent`,
        `reclassificationsByRecPercent.${division}.percent`,
        "memberNumber",
      ])
      .lean()
      .limit(0);

    return shootersTable
      .map((c) => ({
        curPercent: c.current[division],
        curHHFPercent: c.reclassificationsByCurPercent[division].percent,
        recPercent: c.reclassificationsByRecPercent[division].percent,
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
