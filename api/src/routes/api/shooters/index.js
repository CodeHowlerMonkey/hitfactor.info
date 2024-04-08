import {
  getShootersTable,
  getShootersTableByMemberNumber,
} from "../../../dataUtil/shooters.js";

import { basicInfoForClassifierCode } from "../../../dataUtil/classifiersData.js";
import {
  classLetterSort,
  multisort,
  safeNumSort,
} from "../../../../../shared/utils/sort.js";
import { PAGE_SIZE } from "../../../../../shared/constants/pagination.js";
import { classForPercent } from "../../../../../shared/utils/classification.js";
import {
  scoresForDivisionForShooter,
  shooterScoresChartData,
} from "../../../db/scores.js";
import { Shooter } from "../../../db/shooters.js";

const shootersRoutes = async (fastify, opts) => {
  fastify.get("/download/:division", async (req, res) => {
    const { division } = req.params;

    res.header(
      "Content-Disposition",
      `attachment; filename=shooters.${division}.json`
    );
    return getShootersTable()[division];
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

    const shootersTable = getShootersTable()[division];

    let data = multisort(
      shootersTable.filter(
        (c) =>
          (c.class !== "U" && c.class !== "X") ||
          c.reclassificationsCurPercentCurrent > 0
      ),
      sort?.split?.(","),
      order?.split?.(",")
    ).map(({ classifiers, ...run }, index) => ({
      ...run,
      index,
    }));
    const shootersTotalWithoutFilters = data.length;

    if (classFilter) {
      data = data.filter((shooter) => shooter.hqClass === classFilter);
    }

    // Special filter and sort for inconsistencies table
    if (inconString) {
      const [inconsistencies, inconsistenciesMode] = inconString?.split("-");
      data = data.filter(
        (shooter) => !!shooter.reclassificationsCurPercentCurrent
      );
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
      // uncomment to use autosort
      // data = multisort(data, ["hqClass", inconsistencies], [-1, -1]);
    }

    if (filterString) {
      data = data.filter((shooter) =>
        [shooter.name, shooter.memberNumber]
          .join("###")
          .toLowerCase()
          .includes(filterString.toLowerCase())
      );
    }

    return {
      shooters: data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      shootersTotal: data.length,
      shootersTotalWithoutFilters,
      shootersPage: page,
    };
  });

  fastify.get("/download/:division/:memberNumber", async (req, res) => {
    const { division, memberNumber } = req.params;

    const info =
      getShootersTableByMemberNumber()[division]?.[memberNumber]?.[0] || {};
    const data = (
      await scoresForDivisionForShooter({
        division,
        memberNumber,
      })
    ).map((c) => ({
      ...c,
      classifierInfo: basicInfoForClassifierCode(c?.classifier),
    }));

    res.header(
      "Content-Disposition",
      `attachment; filename=shooters.${division}.${memberNumber}.json`
    );

    return {
      info,
      classifiers: data,
    };
  });
  fastify.get("/:division/:memberNumber", async (req, res) => {
    const { division, memberNumber } = req.params;
    const { sort, order, page: pageString } = req.query;

    const info =
      getShootersTableByMemberNumber()[division]?.[memberNumber]?.[0] || {};
    const data = multisort(
      await scoresForDivisionForShooter({ division, memberNumber }),
      sort?.split?.(","),
      order?.split?.(",")
    ).map((c) => ({
      ...c,
      classifierInfo: basicInfoForClassifierCode(c?.classifier),
    }));

    return {
      info,
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
