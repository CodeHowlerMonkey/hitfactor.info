import {
  getShootersTable,
  getShootersTableByMemberNumber,
  shooterChartData,
  classifiersForDivisionForShooter,
  getShooterFullInfo,
} from "../../../dataUtil/shooters.js";

import { basicInfoForClassifierCode } from "../../../dataUtil/classifiersData.js";
import {
  dateSort,
  multisort,
  numSort,
} from "../../../../../shared/utils/sort.js";
import { PAGE_SIZE } from "../../../../../shared/constants/pagination.js";
import {
  mapDivisions,
  mapDivisionsAsync,
} from "../../../dataUtil/divisions.js";
import {
  classForPercent,
  highestClassification,
  lowestAllowedPercentForClass,
  lowestAllowedPercentForOtherDivisionClass,
} from "../../../../../shared/utils/classification.js";
import uniqBy from "lodash.uniqby";
import sortedUniqBy from "lodash.sorteduniqby";

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

    let data = multisort(
      (await getShootersTable())[division],
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
    //    const page = Number(pageString) || 1;
    await getShooterFullInfo({ division, memberNumber });

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
      divisionClassifiers: await mapDivisionsAsync(
        async (div) =>
          await classifiersForDivisionForShooter({
            division: div,
            memberNumber,
          })
      ),
      // TODO: classifiers: data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      // classifiersTotal: data.length,
      // classifiersPage: page,
    };
  });
  fastify.get("/classify/:memberNumber", async (req, res) => {
    const { memberNumber } = req.params;
    const divisionClassifiers = await mapDivisionsAsync(
      async (div) =>
        await classifiersForDivisionForShooter({
          division: div,
          memberNumber,
        })
    );

    // input for calculateUSPSAClassification()
    const classifiersScrambledSorted = [
      ...divisionClassifiers.opn,
      ...divisionClassifiers.ltd,
      ...divisionClassifiers.l10,
      ...divisionClassifiers.prod,
      ...divisionClassifiers.rev,
      ...divisionClassifiers.ss,
      ...divisionClassifiers.co,
      ...divisionClassifiers.lo,
      ...divisionClassifiers.pcc,
    ].sort((a, b) => {
      const asDate = dateSort(a, b, "sd", 1);
      if (!asDate) {
        return numSort(a, b, "percent", -1);
      }
      return asDate;
    });

    return {
      divToHighPercent,
      divToPercent,
      divToWindow,
    };

    // foreach
    // canBeInserted? B or C flag prevents
    // if not keep going
    // if yes  insert, push one out, recalc division

    return classifiersScrambledSorted;
  });

  fastify.get("/:division/:memberNumber/chart", async (req, res) => {
    const { division, memberNumber } = req.params;
    return await shooterChartData({ division, memberNumber });
  });
};

export default shootersRoutes;
