import {
  basicInfoForClassifier,
  classifiers,
  ScsaPointsPerString,
} from "../../../dataUtil/classifiersData";
import {
  divisionsForScoresAdapter,
  hfuDivisionsShortNamesThatNeedMinorHF,
} from "../../../dataUtil/divisions";
import { HF, N, Percent, PositiveOrMinus1 } from "../../../dataUtil/numbers";
import {
  allDivisionClassifiersQuality,
  allScsaDivisionClassifiersQuality,
  Classifiers,
} from "../../../db/classifiers";
import { RecHHFs } from "../../../db/recHHF";
import { Scores } from "../../../db/scores";
import {
  addPlaceAndPercentileAggregation,
  multiSortAndPaginate,
  percentAggregationOp,
  textSearchMatch,
} from "../../../db/utils";

const _getShooterField = field => ({
  $getField: {
    input: { $arrayElemAt: ["$shooters", 0] },
    field,
  },
});
const _getRecHHFField = field => ({
  $getField: {
    input: { $arrayElemAt: ["$rechhfs", 0] },
    field,
  },
});

const _replaceHFWithMinorHFIfNeeded = division =>
  !hfuDivisionsShortNamesThatNeedMinorHF.includes(division)
    ? []
    : [
        {
          $addFields: {
            originalHF: "$hf",
            hf: "$minorHF",
          },
        },
      ];

const _matchScoresForClassifierDivision = (number, division) => ({
  $match: {
    classifier: number,
    division: { $in: divisionsForScoresAdapter(division) },
    hf: { $gt: 0 },
    bad: { $ne: true },
  },
});

// override division and all division-derived fields to given division, used for correct lookup of HFU scores, even when they came from another division
const _overwriteDivision = division => ({
  $addFields: {
    originalDivision: "$division",
    division,
    classifierDivision: { $concat: ["$classifier", ":", division] },
    memberNumberDivision: { $concat: ["$memberNumber", ":", division] },
  },
});
const _runsAggregation = async ({
  classifier,
  division,
  sort,
  order,
  page,
  filterString,
  filterClubString,
}) =>
  Scores.aggregate([
    {
      $project: {
        __v: false,
      },
    },
    ..._replaceHFWithMinorHFIfNeeded(division),
    _matchScoresForClassifierDivision(classifier, division),
    _overwriteDivision(division),
    {
      $lookup: {
        from: "shooters",
        localField: "memberNumberDivision",
        foreignField: "memberNumberDivision",
        as: "shooters",
      },
    },
    {
      $lookup: {
        from: "rechhfs",
        localField: "classifierDivision",
        foreignField: "classifierDivision",
        as: "rechhfs",
      },
    },
    {
      $addFields: {
        // score data for RunsTable
        recHHF: _getRecHHFField("recHHF"),
        curHHF: _getRecHHFField("curHHF"),

        // shooter data for ShooterCell
        hqClass: _getShooterField("class"),
        hqCurrent: _getShooterField("current"),
        name: _getShooterField("name"),
        recClass: _getShooterField("recClass"),
        curHHFClass: _getShooterField("curHHFClass"),
        current: _getShooterField("current"),
        reclassificationsCurPercentCurrent: _getShooterField(
          "reclassificationsCurPercentCurrent",
        ),
        reclassificationsCurPercentHigh: _getShooterField(
          "reclassificationsCurPercentHigh",
        ),
        reclassificationsRecPercentCurrent: _getShooterField(
          "reclassificationsRecPercentCurrent",
        ),
        reclassificationsRecPercentUncappedCurrent: _getShooterField(
          "reclassificationsRecPercentUncappedCurrent",
        ),
        reclassificationsRecPercentUncappedHigh: _getShooterField(
          "reclassificationsRecPercentUncappedHigh",
        ),
      },
    },
    {
      $project: {
        shooters: false,
        rechhfs: false,
        memberNumberDivision: false,
        classifier: false,
      },
    },
    {
      $addFields: {
        recPercent: percentAggregationOp("$hf", "$recHHF", 4),
        curPercent: percentAggregationOp("$hf", "$curHHF", 4),
      },
    },

    ...addPlaceAndPercentileAggregation(
      "hf",
      [
        ...(!filterString
          ? []
          : [{ $match: textSearchMatch(["memberNumber", "name"], filterString) }]),
        ...(!filterClubString ? [] : [{ $match: { clubid: filterClubString } }]),
      ],
      multiSortAndPaginate({ sort, order, page }),
      division.startsWith("scsa_") ? "tooManyDocs" : "normal",
    ),
  ]);

const scsaHhfToPeakTime = (classifier, hf) => {
  const numScoringStrings = classifier === "SC-104" ? 3 : 4;
  return Number(parseFloat(ScsaPointsPerString / (hf / numScoringStrings)).toFixed(2));
};

const classifiersRoutes = async fastify => {
  fastify.get("/", () => classifiers.map(basicInfoForClassifier));

  fastify.get("/:division", async req => {
    const { division } = req.params;
    const [classifiersFromDB, classifiersAllDivQuality] = await Promise.all([
      Classifiers.find({
        division,
        classifier: { $exists: true, $ne: null },
        code: { $exists: true, $ne: null },
      }).populate("recHHFs"),
      division.startsWith("scsa")
        ? allScsaDivisionClassifiersQuality()
        : allDivisionClassifiersQuality(),
    ]);
    return classifiersFromDB.map(c => {
      const cur = c.toObject({ virtuals: true });
      cur.allDivQuality = classifiersAllDivQuality[cur.classifier];
      if (division.startsWith("scsa")) {
        cur.recHHF = scsaHhfToPeakTime(c.classifier, cur.recHHF);
        cur.hhf = scsaHhfToPeakTime(c.classifier, cur.hhf);
      }
      return cur;
    });
  });

  fastify.get("/info/:division/:number", async (req, res) => {
    const { division, number } = req.params;
    const c = classifiers.find(cur => cur.classifier === number);

    if (!c) {
      res.statusCode = 404;
      return { info: null };
    }

    const basic = basicInfoForClassifier(c);
    const [extended, recHHFInfo, totalScores] = await Promise.all([
      Classifiers.findOne({ division, classifier: number }).lean(),
      RecHHFs.findOne({ classifier: number, division })
        .select(["recHHF", "curHHF"])
        .lean(),
      Scores.aggregate([
        _matchScoresForClassifierDivision(number, division),
        { $count: "totalScores" },
      ]),
    ]);

    const result = {
      info: {
        ...basic,
        ...extended,
        curHHF: recHHFInfo?.curHHF || 0,
        recHHF: recHHFInfo?.recHHF || 0,
        totalScores: totalScores?.[0]?.totalScores || -1,
      },
    };

    return result;
  });

  fastify.get("/scores/:division/:number", async req => {
    const { division, number } = req.params;
    const { sort, order, page, club: filterClubString, filter: filterString } = req.query;
    const runsFromDB = await _runsAggregation({
      classifier: number,
      division,
      filterString,
      filterClubString,
      sort,
      order,
      page,
    });

    return {
      runs: runsFromDB.map((run, index) => {
        const percent = N(run.percent);
        const curPercent = PositiveOrMinus1(run.curPercent);
        const recPercent = PositiveOrMinus1(run.recPercent);
        const percentMinusCurPercent = N(percent - curPercent);

        run.sd = new Date(run.sd).toLocaleDateString("en-us", { timeZone: "UTC" });
        run.historicalHHF = HF((100 * run.hf) / run.percent); // recalculated only
        run.percent = percent;
        run.curPercent = curPercent;
        run.recPercent = recPercent;
        run.percentMinusCurPercent = percent >= 100 ? 0 : percentMinusCurPercent;
        run.classifier = number;
        run.index = index;
        if (division.startsWith("scsa")) {
          // This is the "adapter" hack that makes everything work in the frontend for SCSA.
          run.hf = Number(run.stageTimeSecs);
        }
        return run;
      }),
      runsTotal: runsFromDB[0]?.total || 0,
      runsTotalWithFilters: runsFromDB[0]?.totalWithFilters || 0,
      runsPage: Number(page) || 1,
    };
  });

  fastify.get("/:division/:number/chart", async req => {
    const { division, number } = req.params;
    const { full: fullString, limit: limitString } = req.query;
    const full = Number(fullString);
    const limit = Number(limitString) || 99999;

    const runs = await Scores.aggregate([
      {
        $project: {
          sd: true,
          minorHF: true,
          hf: true,
          memberNumber: true,
          memberNumberDivision: true,
          classifier: true,
          division: true,
          bad: true,
          _id: false,
        },
      },
      ..._replaceHFWithMinorHFIfNeeded(division),
      _matchScoresForClassifierDivision(number, division),
      _overwriteDivision(division),
      {
        $lookup: {
          from: "shooters",
          localField: "memberNumberDivision",
          foreignField: "memberNumberDivision",
          as: "shooters",
        },
      },
      {
        $lookup: {
          from: "rechhfs",
          localField: "classifierDivision",
          foreignField: "classifierDivision",
          as: "rechhfs",
        },
      },
      {
        $addFields: {
          recHHF: _getRecHHFField("recHHF"),
        },
      },
      {
        $project: { rechhfs: false },
      },
      {
        $addFields: {
          scoreRecPercent: percentAggregationOp("$hf", "$recHHF", 4),
          curPercent: _getShooterField("current"),

          // reclassifications current
          curHHFPercent: _getShooterField("reclassificationsCurPercentCurrent"),
          recHHFOnlyPercent: _getShooterField(
            "reclassificationsRecHHFOnlyPercentCurrent",
          ),
          recSoftPercent: _getShooterField("reclassificationsSoftPercentCurrent"),
          recPercent: _getShooterField("reclassificationsRecPercentCurrent"),
          recPercentUncapped: _getShooterField(
            "reclassificationsRecPercentUncappedCurrent",
          ),

          // reclassifications high
          curHHFPercentHigh: _getShooterField("reclassificationsCurPercentHigh"),
          recHHFOnlyPercentHigh: _getShooterField(
            "reclassificationsRecHHFOnlyPercentHigh",
          ),
          recSoftPercentHigh: _getShooterField("reclassificationsSoftPercentHigh"),
          recPercentHigh: _getShooterField("reclassificationsRecPercentHigh"),
          recPercentUncappedHigh: _getShooterField(
            "reclassificationsRecPercentUncappedHigh",
          ),

          elo: _getShooterField("elo"),
          name: _getShooterField("name"),
        },
      },
      {
        $project: {
          shooters: false,
          recHHFs: false,
          memberNumberDivision: false,
          classifier: false,
          division: false,
        },
      },

      { $sort: { sd: 1 } },
      { $limit: limit },
      { $sort: { hf: -1 } },
      ...(full
        ? []
        : [
            {
              $bucketAuto: {
                groupBy: "$hf",
                buckets: 400,
                output: {
                  hf: { $avg: "$hf" },
                  sd: { $first: "$sd" },
                  curPercent: { $avg: "$curPercent" },
                  curHHFPercent: { $avg: "$curHHFPercent" },
                  recPercent: { $avg: "$recPercent" },
                  scoreRecPercent: { $avg: "$scoreRecPercent" },
                  recPercentUncapped: { $avg: "$recPercentUncapped" },
                },
              },
            },
          ]),
    ]);

    return runs.map((run, index, allRuns) => ({
      ...run,
      x: HF(run.hf),
      y: PositiveOrMinus1(Percent(index, allRuns.length)),
      memberNumber: run.memberNumber || "",
      curPercent: run.curPercent || 0,
      curHHFPercent: run.curHHFPercent || 0,
      recPercent: run.recPercent || 0,
      scoreRecPercent: run.scoreRecPercent || 0,
      date: run.sd?.getTime(),
    }));
  });
};

export default classifiersRoutes;
