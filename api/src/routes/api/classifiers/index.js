import memoize from "memoize";
import {
  basicInfoForClassifier,
  classifiers,
} from "../../../dataUtil/classifiersData.js";

import {
  classifiersForDivision,
  extendedInfoForClassifier,
  runsForDivisionClassifier,
  chartData,
} from "../../../classifiers.api.js";

import { multisort } from "../../../../../shared/utils/sort.js";
import { PAGE_SIZE } from "../../../../../shared/constants/pagination.js";
import { mapDivisionsAsync } from "../../../dataUtil/divisions.js";
import { getShooterToRuns } from "../../../dataUtil/classifiers.js";
import {
  recommendedHHFByPercentileAndPercent,
  recommendedHHFFor,
} from "../../../dataUtil/recommendedHHF.js";

const classifiersRoutes = async (fastify, opts) => {
  fastify.get("/", (req, res) => classifiers.map(basicInfoForClassifier));

  fastify.get(
    "/:division",
    { compress: false },
    async (req) => await classifiersForDivision(req.params.division)
  );

  fastify.get("/download/:division", { compress: false }, async (req, res) => {
    const { division } = req.params;
    res.header(
      "Content-Disposition",
      `attachment; filename=classifiers.${division}.json`
    );
    return await classifiersForDivision(division);
  });

  fastify.get("/:division/:number", async (req, res) => {
    const { division, number } = req.params;
    const {
      sort,
      order,
      page: pageString,
      legacy,
      hhf: filterHHFString,
      club: filterClubString,
      filter: filterString,
    } = req.query;
    const includeNoHF = Number(legacy) === 1;
    const page = Number(pageString) || 1;
    const filterHHF = parseFloat(filterHHFString);
    const c = classifiers.find((cur) => cur.classifier === number);

    if (!c) {
      res.statusCode = 404;
      return { info: null, runs: [] };
    }

    const basic = basicInfoForClassifier(c);
    const extended = await extendedInfoForClassifier(c, division);
    const { hhf, hhfs } = extended;

    const allRuns = await runsForDivisionClassifier({
      number,
      division,
      hhf,
      includeNoHF,
      hhfs,
    });
    let runsUnsorted = allRuns;
    if (filterHHF) {
      runsUnsorted = runsUnsorted.filter(
        (run) => Math.abs(filterHHF - run.historicalHHF) <= 0.00015
      );
    }
    if (filterString) {
      runsUnsorted = runsUnsorted.filter((run) =>
        [run.clubid, run.club_name, run.memberNumber, run.name]
          .join("###")
          .toLowerCase()
          .includes(filterString.toLowerCase())
      );
    }
    if (filterClubString) {
      runsUnsorted = runsUnsorted
        .filter((run) => run.clubid === filterClubString)
        .slice(0, 10);
    }
    const runs = multisort(
      runsUnsorted,
      sort?.split?.(","),
      order?.split?.(",")
    ).map((run, index) => ({ ...run, index }));

    // const extendedCalibrationTable = await getExtendedCalibrationShootersPercentileTable();

    // Not using calculated percentiles, because it's all over the place in different divisions
    // Closest to reality is curPercent in CO, and few good classifiers there, which show
    // GM shooters start where they should. These classifiers are
    // 99-07 Both Sides Now
    // 03-03 Take em Down
    // 06-01 Big Barricade
    // 06-02 Big Barricade II
    // 09-13 Table Stakes
    // 19-02 Hi-Way Robbery
    // So we're just gonna eye-ball percentiles for 3 recommendation algos based on these
    // classifiers for now.
    // It can always be adjusted later.

    return {
      info: {
        ...basic,
        ...extended,
        recHHF: await recommendedHHFFor({ division, number }),
        recommendedHHF1: recommendedHHFByPercentileAndPercent(
          allRuns,
          0.9, // extendedCalibrationTable[division].pGM,
          95
        ),
        recommendedHHF5: recommendedHHFByPercentileAndPercent(
          allRuns,
          5.1, // extendedCalibrationTable[division].pM,
          85
        ),
        recommendedHHF15: recommendedHHFByPercentileAndPercent(
          allRuns,
          14.5, // extendedCalibrationTable[division].pA,
          75
        ),
      },
      runs: runs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      runsTotal: runs.length,
      runsPage: page,
    };
  });

  fastify.get(
    "/download/:division/:number",
    { compress: false },
    async (req, res) => {
      const { division, number } = req.params;
      const c = classifiers.find((cur) => cur.classifier === number);

      res.header(
        "Content-Disposition",
        `attachment; filename=classifiers.${division}.${number}.json`
      );

      if (!c) {
        res.statusCode = 404;
        return { info: null, runs: [] };
      }

      const basic = basicInfoForClassifier(c);
      const extended = await extendedInfoForClassifier(c, division);
      const { hhf, hhfs } = extended;

      return {
        info: {
          ...basic,
          ...extended,
        },
        runs: await runsForDivisionClassifier({
          number,
          division,
          hhf,
          includeNoHF: false,
          hhfs,
        }),
      };
    }
  );

  fastify.get("/:division/:number/chart", async (req, res) => {
    const { division, number } = req.params;
    const { full } = req.query;
    return await chartData({ division, number, full });
  });
};

export default classifiersRoutes;
