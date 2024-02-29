import {
  basicInfoForClassifier,
  classifiers,
} from "../../../dataUtil/classifiersData.js";

import {
  extendedInfoForClassifier,
  runsForDivisionClassifier,
  chartData,
} from "../../../classifiers.api.js";

import { multisort } from "../../../../../shared/utils/sort.js";
import { PAGE_SIZE } from "../../../../../shared/constants/pagination.js";
import { HF } from "../../../dataUtil/numbers.js";

const classifiersForDivision = (division) =>
  classifiers.map((c) => ({
    ...basicInfoForClassifier(c),
    ...extendedInfoForClassifier(c, division),
  }));

/**
 * Calculated recommended HHF by matching lower percent of the score to percentile of shooters
 * who should be able to get that score.
 *
 * Used with 1Percentile for GM (95%) and 5Percentile for M(85%)
 * @param runs classifier scores, sorted by HF or curPercent. MUST BE SORTED for percentile math.
 * @param percentile what percentile to search for 0 to 100
 * @param percent what percent score to assign to it 0 to 100
 */
const recommendedHHFByPercentileAndPercent = (
  runs,
  targetPercentile,
  percent
) => {
  const closestPercentileRun = runs.sort(
    (a, b) =>
      Math.abs(a.percentile - targetPercentile) -
      Math.abs(b.percentile - targetPercentile)
  )[0];
  return HF(
    (closestPercentileRun.hf * closestPercentileRun.percentile) /
      targetPercentile /
      (percent / 100.0)
  );
};

const classifiersRoutes = async (fastify, opts) => {
  fastify.get("/", (req, res) => classifiers.map(basicInfoForClassifier));

  fastify.get("/:division", (req) =>
    classifiersForDivision(req.params.division)
  );

  fastify.get("/download/:division", { compress: false }, (req, res) => {
    const { division } = req.params;
    res.header(
      "Content-Disposition",
      `attachment; filename=classifiers.${division}.json`
    );
    return classifiersForDivision(division);
  });

  fastify.get("/:division/:number", (req, res) => {
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
    const extended = extendedInfoForClassifier(c, division);
    const { hhf, hhfs } = extended;

    let runsUnsorted = runsForDivisionClassifier({
      number,
      division,
      hhf,
      includeNoHF,
      hhfs,
    });
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

    return {
      info: {
        ...basic,
        ...extended,
        recommendedHHF1: recommendedHHFByPercentileAndPercent(
          runsUnsorted,
          1.114233117, // curPercentile for 95%+ shooters in CO
          95
        ),
        recommendedHHF5: recommendedHHFByPercentileAndPercent(
          runsUnsorted,
          6.045925782, // curPercentile for 85%+ shooters in CO
          85
        ),
        recommendedHHF15: recommendedHHFByPercentileAndPercent(
          runsUnsorted,
          20.24221453, //14.70787714, // curPercentile for 75%+ shooters in CO
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
    (req, res) => {
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
      const extended = extendedInfoForClassifier(c, division);
      const { hhf, hhfs } = extended;

      return {
        info: {
          ...basic,
          ...extended,
        },
        runs: runsForDivisionClassifier({
          number,
          division,
          hhf,
          includeNoHF: false,
          hhfs,
        }),
      };
    }
  );

  fastify.get("/:division/:number/chart", (req, res) => {
    const { division, number } = req.params;
    const { full } = req.query;
    return chartData({ division, number, full });
  });
};

export default classifiersRoutes;
