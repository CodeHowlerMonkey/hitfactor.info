import {
  getShootersTable,
  getShootersTableByMemberNumber,
  shooterChartData,
  classifiersForDivisionForShooter,
} from "../../../dataUtil/shooters.js";

import { basicInfoForClassifierCode } from "../../../dataUtil/classifiersData.js";
import { multisort } from "../../../../../shared/utils/sort.js";
import { PAGE_SIZE } from "../../../../../shared/constants/pagination.js";
import { getShooterToCurPercentClassifications } from "../../../dataUtil/classifiers.js";

const shootersRoutes = async (fastify, opts) => {
  fastify.get("/download/:division", { compress: false }, async (req, res) => {
    const { division } = req.params;
    res.header(
      "Content-Disposition",
      `attachment; filename=shooters.${division}.json`
    );
    return (await getShootersTable())[division];
  });
  fastify.get("/:division", async (req, res) => {
    const { division } = req.params;
    const { sort, order, page: pageString, filter: filterString } = req.query;
    const page = Number(pageString) || 1;

    const shootersTable = (await getShootersTable())[division];

    let data = multisort(
      shootersTable.filter((c) => c.class !== "U" && c.class !== "X"),
      sort?.split?.(","),
      order?.split?.(",")
    ).map(({ classifiers, ...run }, index) => ({ ...run, index }));
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
      shootersPage: page,
    };
  });

  fastify.addHook("onListen", async () => {
    console.log("hydrating shooters");
    await getShootersTable();
    await getShootersTableByMemberNumber();
    await getShooterToCurPercentClassifications();
    console.log("done hydrating shooters");
  });

  fastify.get(
    "/download/:division/:memberNumber",
    { compress: false },
    async (req, res) => {
      const { division, memberNumber } = req.params;

      const info =
        (await getShootersTableByMemberNumber())[division]?.[
          memberNumber
        ]?.[0] || {};
      const data = (
        await classifiersForDivisionForShooter({
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
    }
  );
  fastify.get("/:division/:memberNumber", async (req, res) => {
    const { division, memberNumber } = req.params;
    const { sort, order, page: pageString } = req.query;

    const info =
      (await getShootersTableByMemberNumber())[division]?.[memberNumber]?.[0] ||
      {};
    const data = multisort(
      await classifiersForDivisionForShooter({ division, memberNumber }),
      sort?.split?.(","),
      order?.split?.(",")
    ).map((c) => ({
      ...c,
      classifierInfo: basicInfoForClassifierCode(c?.classifier),
    }));

    return {
      info,
      classifiers: data,
      // TODO: classifiers: data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      // classifiersTotal: data.length,
      // classifiersPage: page,
    };
  });

  fastify.get("/:division/:memberNumber/chart", async (req, res) => {
    const { division, memberNumber } = req.params;
    return await shooterChartData({ division, memberNumber });
  });
};

export default shootersRoutes;
