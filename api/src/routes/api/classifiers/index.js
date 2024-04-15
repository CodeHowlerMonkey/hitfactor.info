import uniqBy from "lodash.uniqby";

import { basicInfoForClassifier, classifiers } from "../../../dataUtil/classifiersData.js";
import { HF, N, Percent, PositiveOrMinus1 } from "../../../dataUtil/numbers.js";
import { curHHFForDivisionClassifier } from "../../../dataUtil/hhf.js";
import { Score } from "../../../db/scores.js";
import { Shooter } from "../../../db/shooters.js";
import { Classifier } from "../../../db/classifiers.js";

import { multisort } from "../../../../../shared/utils/sort.js";
import { PAGE_SIZE } from "../../../../../shared/constants/pagination.js";
import { RecHHF } from "../../../db/recHHF.js";

const _getShooterField = (field) => ({
  $getField: {
    input: { $arrayElemAt: ["$shooters", 0] },
    field,
  },
});
const _runs = async ({ number, division, hhf, hhfs }) => {
  const runs = await Score.aggregate([
    {
      $project: {
        _id: false,
      },
    },
    { $match: { classifier: number, division, hf: { $gt: 0 } } },
    {
      $lookup: {
        from: "shooters",
        localField: "memberNumberDivision",
        foreignField: "memberNumberDivision",
        as: "shooters",
      },
    },
    {
      $addFields: {
        class: _getShooterField("class"),
        current: _getShooterField("current"),
        name: _getShooterField("name"),
        reclassifications: _getShooterField("reclassifications"),
        recClass: _getShooterField("recClass"),
        curHHFClass: _getShooterField("curHHFClass"),
        reclassificationsCurPercentCurrent: _getShooterField("reclassificationsCurPercentCurrent"),
        reclassificationsRecPercentCurrent: _getShooterField("reclassificationsRecPercentCurrent"),
      },
    },
    {
      $project: {
        shooters: false,
        memberNumberDivision: false,
        classifier: false,
        division: false,
      },
    },
    { $sort: { hf: -1 } },
  ]);

  return runs.map((run, index, allRuns) => {
    const { memberNumber } = run;
    const percent = N(run.percent);
    const curPercent = PositiveOrMinus1(Percent(run.hf, hhf));
    const recPercent = PositiveOrMinus1(Percent(run.hf, run.recHHF));
    const percentMinusCurPercent = N(percent - curPercent);

    const findHistoricalHHF = hhfs.findLast((hhf) => hhf.date <= new Date(run.sd).getTime())?.hhf;

    const recalcHistoricalHHF = HF((100 * run.hf) / run.percent);

    return {
      ...run,
      sd: new Date(run.sd).toLocaleDateString("en-us", { timeZone: "UTC" }),
      historicalHHF: findHistoricalHHF ?? recalcHistoricalHHF,
      percent,
      curPercent,
      recPercent,
      percentMinusCurPercent: percent >= 100 ? 0 : percentMinusCurPercent,
      place: index + 1,
      percentile: PositiveOrMinus1(Percent(index, allRuns.length)),
      memberNumber,
      division,
    };
  });
};

const classifiersRoutes = async (fastify, opts) => {
  fastify.get("/", (req, res) => classifiers.map(basicInfoForClassifier));

  fastify.get("/:division", async (req) => {
    const { division } = req.params;
    return Classifier.find({ division });
  });

  fastify.get("/download/:division", async (req, res) => {
    const { division } = req.params;
    res.header("Content-Disposition", `attachment; filename=classifiers.${division}.json`);
    return Classifier.find({ division });
  });

  fastify.get("/:division/:number", async (req, res) => {
    const { division, number } = req.params;
    const {
      sort,
      order,
      page: pageString,
      hhf: filterHHFString,
      club: filterClubString,
      filter: filterString,
    } = req.query;
    const page = Number(pageString) || 1;
    const filterHHF = parseFloat(filterHHFString);
    const c = classifiers.find((cur) => cur.classifier === number);

    if (!c) {
      res.statusCode = 404;
      return { info: null, runs: [] };
    }

    const basic = basicInfoForClassifier(c);
    const extended = await Classifier.findOne({
      division,
      classifier: number,
    }).lean();
    const { hhf, hhfs } = extended;

    const allRuns = await _runs({
      number,
      division,
      hhf,
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
      runsUnsorted = runsUnsorted.filter((run) => run.clubid === filterClubString).slice(0, 10);
    }
    const runs = multisort(runsUnsorted, sort?.split?.(","), order?.split?.(",")).map(
      (run, index) => ({ ...run, index })
    );

    const recHHFInfo = await RecHHF.findOne({ classifier: number, division })
      .select(["recHHF", "rec1HHF", "rec5HHF", "rec15HHF"])
      .lean();

    const result = {
      info: {
        ...basic,
        ...extended,
        recHHF: recHHFInfo?.recHHF || 0,
        recommendedHHF1: recHHFInfo?.rec1HHF || 0,
        recommendedHHF5: recHHFInfo?.rec5HHF || 0,
        recommendedHHF15: recHHFInfo?.rec15HHF || 0,
      },
      runs: runs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      runsTotal: runs.length,
      runsPage: page,
    };

    return result;
  });

  fastify.get("/download/:division/:number", async (req, res) => {
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
    const extended = await Classifier.findOne({
      division,
      classifier: number,
    }).lean();
    const { hhf, hhfs } = extended;

    return {
      info: {
        ...basic,
        ...extended,
      },
      runs: await _runs({
        number,
        division,
        hhf,
        hhfs,
      }),
    };
  });

  fastify.get("/:division/:number/chart", async (req, res) => {
    const { division, number } = req.params;
    const { full: fullString } = req.query;
    const full = Number(fullString);

    const runs = await Score.aggregate([
      {
        $project: {
          hf: true,
          memberNumber: true,
          memberNumberDivision: true,
          classifier: true,
          division: true,
          _id: false,
        },
      },
      { $match: { classifier: number, division, hf: { $gt: 0 } } },
      {
        $lookup: {
          from: "shooters",
          localField: "memberNumberDivision",
          foreignField: "memberNumberDivision",
          as: "shooters",
        },
      },
      {
        $addFields: {
          curPercent: {
            $getField: {
              input: { $arrayElemAt: ["$shooters", 0] },
              field: "current",
            },
          },
          curHHFPercent: {
            $getField: {
              input: { $arrayElemAt: ["$shooters", 0] },
              field: "reclassificationsCurPercentCurrent",
            },
          },
          recPercent: {
            $getField: {
              input: { $arrayElemAt: ["$shooters", 0] },
              field: "reclassificationsRecPercentCurrent",
            },
          },
        },
      },
      {
        $project: {
          shooters: false,
          memberNumberDivision: false,
          classifier: false,
          division: false,
        },
      },
      { $sort: { hf: -1 } },
    ]);

    const hhf = curHHFForDivisionClassifier({ number, division });
    const allPoints = runs.map((run, index, allRuns) => ({
      x: HF(run.hf),
      y: PositiveOrMinus1(Percent(index, allRuns.length)),
      memberNumber: run.memberNumber,
      curPercent: run.curPercent || 0,
      curHHFPercent: run.curHHFPercent || 0,
      recPercent: run.recPercent || 0,
    }));

    // for zoomed in mode return all points
    if (full === 1) {
      return allPoints;
    }

    // always return top 100 points, and reduce by 0.5% grouping for other to make render easier
    const first50 = allPoints.slice(0, 100);
    const other = allPoints.slice(100, allPoints.length);
    return [
      ...first50,
      ...uniqBy(
        other,
        ({ x }) => Math.floor((200 * x) / hhf) // 0.5% grouping for graph points reduction
      ),
    ];
  });
};

export default classifiersRoutes;
