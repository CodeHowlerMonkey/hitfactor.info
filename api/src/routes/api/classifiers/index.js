import { uspsaClassifiers2025 } from "@shared/constants/classifiers";
import { ageForDate } from "@shared/utils/date";

import {
  basicInfoForClassifier,
  classifiers,
  ScsaPointsPerString,
} from "../../../dataUtil/classifiersData";
import {
  divisionsForScoresAdapter,
  L10_OPTICS_EFFECTIVE_TS,
} from "../../../dataUtil/divisions";
import { HF, N, Percent, PositiveOrMinus1 } from "../../../dataUtil/numbers";
import { allDivisionClassifiersQuality, Classifiers } from "../../../db/classifiers";
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

const _matchScoresForClassifierDivision = (number, division) => ({
  $match: {
    classifier: number,
    ...divisionsForScoresAdapter(division),
    hf: { $gt: 0 },
    bad: { $ne: true },

    ...(division === "l10" ? { sd: { $gte: new Date(L10_OPTICS_EFFECTIVE_TS) } } : {}),
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
    _matchScoresForClassifierDivision(classifier, division),
    {
      $project: {
        __v: false,
      },
    },
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
        oldHHF: _getRecHHFField("oldHHF"),

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
        curPercent: percentAggregationOp("$hf", "$curHHF", 4, -1),
        oldPercent: percentAggregationOp("$hf", "$oldHHF", 4),
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
        classifier: { $in: uspsaClassifiers2025 },
      }).populate("recHHFs"),
      allDivisionClassifiersQuality(),
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
        .select(["recHHF", "curHHF", "oldHHF", "k", "lambda"])
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
        oldHHF: recHHFInfo?.oldHHF || 0,
        curHHF: recHHFInfo?.curHHF || 0,
        recHHF: recHHFInfo?.recHHF || 0,
        k: recHHFInfo?.k || 0,
        lambda: recHHFInfo?.lambda || 0,
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
    const limit = Number(limitString) || 9999999;

    try {
      const runs = await Scores.aggregate(
        [
          _matchScoresForClassifierDivision(number, division),
          // limit to 3000 most recent scores in preview chart mode before any $lookups
          ...(full ? [] : [{ $sort: { sd: -1 } }, { $limit: 3000 }]),
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
              recPercentUncapped: _getShooterField(
                "reclassificationsRecPercentUncappedCurrent",
              ),
              recPercentUncappedHigh: _getShooterField(
                "reclassificationsRecPercentUncappedHigh",
              ),

              ...(!full
                ? {}
                : {
                    recPercentHistory: _getShooterField(
                      "reclassificationsRecPercentHistory",
                    ),
                    majorsHistory: _getShooterField("reclassificationsMajorsHistory"),
                    classifiersHistory: _getShooterField(
                      "reclassificationsClassifiersHistory",
                    ),
                  }),

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
        ],
        { timeoutMS: 20_000 },
      );

      return runs.map((run, index, allRuns) => {
        const majorsHistory = run.majorsHistory?.findLast(
          ({ sd }) => run.sd.getTime() - sd.getTime() > 0,
        );
        const classifiersHistory = run.classifiersHistory?.findLast(
          ({ sd }) => run.sd.getTime() - sd.getTime() > 0,
        );
        const recPercentHistory = run.recPercentHistory?.findLast(
          ({ sd }) => run.sd.getTime() - sd.getTime() > 0,
        );

        delete run.majorsHistory;
        delete run.classifiersHistory;
        delete run.recPercentHistory;

        return {
          ...run,
          x: HF(run.hf),
          y: PositiveOrMinus1(Percent(index, allRuns.length)),
          memberNumber: run.memberNumber || "",
          curPercent: run.curPercent || 0,
          curHHFPercent: run.curHHFPercent || 0,
          recPercent: run.recPercent || 0,
          date: run.sd?.getTime(),

          ...(!full
            ? {}
            : {
                majors: majorsHistory?.p ?? 0,
                classifiers: classifiersHistory?.p ?? 0,
                recPercentUncapped: recPercentHistory?.p ?? 0,
                majorsDate: majorsHistory?.sd ?? null,
                classifiersDate: classifiersHistory?.sd ?? null,
                recPercentDate: recPercentHistory?.sd ?? null,
                majorsAge:
                  !majorsHistory?.sd || !run.sd
                    ? null
                    : ageForDate(run.sd, majorsHistory.sd),
                classifiersAge:
                  !classifiersHistory?.sd || !run.sd
                    ? null
                    : ageForDate(run.sd, classifiersHistory.sd),
                recPercentAge:
                  !recPercentHistory?.sd || !run.sd
                    ? null
                    : ageForDate(run.sd, recPercentHistory.sd),
              }),
        };
      });
    } catch (all) {
      return [];
    }
  });
};

export default classifiersRoutes;
