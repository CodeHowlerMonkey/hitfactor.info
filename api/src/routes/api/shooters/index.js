import {
  shootersTable,
  shootersTableByMemberNumber,
  shooterChartData,
} from "../../../dataUtil/shooters.js";

import { basicInfoForClassifierCode } from "../../../dataUtil/classifiers.js";
import { multisort } from "../../../../../shared/utils/sort.js";

const shootersRoutes = async (fastify, opts) => {
  fastify.get("/:division", (req, res) => {
    const { division } = req.params;
    const { sort, order, page: pageString, filter: filterString } = req.query;
    const page = Number(pageString) || 1;

    let data = multisort(
      shootersTable[division],
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
  fastify.get("/:division/:memberNumber", (req, res) => {
    const { division, memberNumber } = req.params;
    const { sort, order, page: pageString } = req.query;
    const page = Number(pageString) || 1;

    const { classifiers, ...info } =
      shootersTableByMemberNumber[division]?.[memberNumber]?.[0] || {};
    const data = multisort(
      classifiers,
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
  fastify.get("/:division/:memberNumber/chart", (req, res) => {
    const { division, memberNumber } = req.params;
    return shooterChartData({ division, memberNumber });
  });
};

export default shootersRoutes;
