import uniqBy from "lodash.uniqby";

import { classificationDifficulty } from "../../../../../shared/constants/difficulty";
import { calculateUSPSAClassification } from "../../../../../shared/utils/classification";
import { classForPercent } from "../../../../../shared/utils/classification";
import { multisort, safeNumSort } from "../../../../../shared/utils/sort";
import { basicInfoForClassifierCode } from "../../../dataUtil/classifiersData";
import { RecHHFs } from "../../../db/recHHF";
import { scoresForDivisionForShooter, shooterScoresChartData } from "../../../db/scores";
import {
  Shooters,
  allDivisionsScores,
  dedupeGrandbagging,
  reclassificationForProgressMode,
  scoresForRecommendedClassification,
} from "../../../db/shooters";
import {
  addPlaceAndPercentileAggregation,
  multiSortAndPaginate,
  textSearchMatch,
} from "../../../db/utils";

const DEFAULT_PLACE_BY = "reclassificationsRecPercentUncappedCurrent";
const placeByFieldForSort = sort => {
  if (
    sort &&
    [
      "current",
      "reclassificationsCurPercentCurrent",
      "reclassificationsRecHHFOnlyPercentCurrent",
      "reclassificationsRecPercentCurrent",
      "reclassificationsSoftPercentCurrent",
    ].includes(sort)
  ) {
    return sort;
  }

  return DEFAULT_PLACE_BY;
};

const _inconsistencyFilter = inconString => {
  if (!inconString) {
    return [];
  }

  const [inconsistencies, inconsistenciesMode] = inconString.split("-");
  const field = `$${inconsistencies}Rank`;
  const operator = inconsistenciesMode === "paper" ? "$lt" : "$gt";
  // TODO: should this change to curHHFClassRank?
  return [{ $match: { $expr: { [operator]: [field, "$hqClassRank"] } } }];
};

const shootersQueryAggregation = (params, query) => {
  const { division } = params;
  const {
    filter: filterString,
    inconsistencies: inconString,
    classFilter,
    sort,
    order,
    page,
  } = query;

  const placeByField = placeByFieldForSort(sort);

  return Shooters.aggregate([
    // default match
    {
      $project: {
        __v: false,
      },
    },
    {
      $match: {
        division,
        [placeByField]: { $gt: 0 },
      },
    },
    ...addPlaceAndPercentileAggregation(
      placeByField,
      [
        ...(!classFilter ? [] : [{ $match: { class: classFilter } }]),
        ...(!filterString
          ? []
          : [{ $match: textSearchMatch(["memberNumber", "name"], filterString) }]),
        ..._inconsistencyFilter(inconString),
      ],
      multiSortAndPaginate({ sort, order, page }),
    ),
  ]);
};

const shootersRoutes = async fastify => {
  fastify.get("/:division", async req => {
    const shooters = await shootersQueryAggregation(req.params, req.query);

    return {
      shooters,
      shootersTotal: shooters[0]?.total || 0,
      shootersTotalWithoutFilters: shooters[0]?.totalWithoutFilters || 0,
      shootersPage: Number(req.query.page) || 1,
    };
  });

  fastify.get("/:division/:memberNumber", async req => {
    const { division, memberNumber } = req.params;
    const { sort, order } = req.query;

    const [infos, scoresData] = await Promise.all([
      Shooters.find({ memberNumber }).limit(0).lean(),
      scoresForDivisionForShooter({
        division,
        memberNumber,
      }),
    ]);

    const data = multisort(scoresData, sort?.split?.(","), order?.split?.(",")).map(
      c => ({
        ...c,
        classifierInfo: basicInfoForClassifierCode(c?.classifier) || {},
        hf: division.startsWith("scsa") ? Number(c.stageTimeSecs) : c.hf,
      }),
    );

    const info = infos.find(s => s.division === division) || {};
    info.classificationByDivision = infos.reduce((acc, cur) => {
      const {
        reclassificationsCurPercentCurrent: curHHFCurrent,
        reclassificationsRecPercentUncappedCurrent: recCurrent,
        reclassificationsCurPercentHigh: curHHFHigh,
        reclassificationsRecPercentUncappedHigh: recHigh,
      } = cur;

      acc[cur.division] = {
        reclassificationsCurPercentCurrent: curHHFCurrent || 0,
        reclassificationsRecPercentUncappedCurrent: recCurrent || 0,
        reclassificationsCurPercentHigh: curHHFHigh || 0,
        reclassificationsRecPercentUncappedHigh: recHigh || 0,
        age: cur.age,
        age1: cur.age1,
      };
      return acc;
    }, {});
    delete info.reclassifications;
    delete info.classes;
    delete info.currents;
    delete info.ages;
    delete info.age1s;

    return {
      info: info || {},
      classifiers: data,
    };
  });

  fastify.get("/:division/:memberNumber/chart", async req => {
    const { division, memberNumber } = req.params;
    return shooterScoresChartData({ division, memberNumber });
  });

  fastify.get("/:division/:memberNumber/chart/progress/:mode", async req => {
    const { division, memberNumber, mode } = req.params;
    const reclass = await reclassificationForProgressMode(mode, memberNumber);
    return reclass?.[division]?.percentWithDates || [];
  });

  fastify.get("/:division/chart", async req => {
    const { division } = req.params;
    const shootersTable = await Shooters.find({
      division,
      reclassificationsRecPercentCurrent: { $gt: 0 },
    })
      .select([
        "current",
        "reclassificationsCurPercentCurrent",
        "reclassificationsRecHHFOnlyPercentCurrent",
        "reclassificationsSoftPercentCurrent",
        "reclassificationsRecPercentCurrent",
        "reclassificationsRecPercentUncappedCurrent",
        "reclassificationsCurPercentHigh",
        "reclassificationsRecHHFOnlyPercentHigh",
        "reclassificationsSoftPercentHigh",
        "reclassificationsRecPercentHigh",
        "reclassificationsRecPercentUncappedHigh",
        "memberNumber",
      ])
      .lean()
      .limit(0);

    return shootersTable
      .map(c => ({
        curPercent: c.current,
        curHHFPercent: c.reclassificationsCurPercentCurrent,
        recHHFOnlyPercent: c.reclassificationsRecHHFOnlyPercentCurrent,
        recSoftPercent: c.reclassificationsSoftPercentCurrent,
        recPercent: c.reclassificationsRecPercentCurrent,
        recPercentUncapped: c.reclassificationsRecPercentUncappedCurrent,
        curHHFPercentHigh: c.reclassificationsCurPercentHigh,
        recHHFOnlyPercentHigh: c.reclassificationsRecHHFOnlyPercentHigh,
        recSoftPercentHigh: c.reclassificationsSoftPercentHigh,
        recPercentHigh: c.reclassificationsRecPercentHigh,
        recPercentUncappedHigh: c.reclassificationsRecPercentUncappedHigh,
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
      .sort(safeNumSort("curHHFPercentHigh"))
      .map((c, i, all) => ({
        ...c,
        curHHFPercentHighPercentile: (100 * i) / (all.length - 1),
      }))
      .sort(safeNumSort("recHHFOnlyPercent"))
      .map((c, i, all) => ({
        ...c,
        recHHFOnlyPercentPercentile: (100 * i) / (all.length - 1),
      }))
      .sort(safeNumSort("recSoftPercent"))
      .map((c, i, all) => ({
        ...c,
        recSoftPercentPercentile: (100 * i) / (all.length - 1),
      }))
      .sort(safeNumSort("recPercentUncapped"))
      .map((c, i, all) => ({
        ...c,
        recPercentUncappedPercentile: (100 * i) / (all.length - 1),
      }))
      .sort(safeNumSort("recPercentUncappedHigh"))
      .map((c, i, all) => ({
        ...c,
        recPercentUncappedHighPercentile: (100 * i) / (all.length - 1),
      }))
      .sort(safeNumSort("recPercent"))
      .map((c, i, all) => ({
        ...c,
        recPercentPercentile: (100 * i) / (all.length - 1),
      }));
  });
  fastify.post("/whatif", async req => {
    const { scores, division, memberNumber } = req.body;
    const now = new Date();

    const lookupHHFs = uniqBy(
      scores
        .filter(s => s.hf && s.classifier && s.source !== "Major Match")
        .map(s => {
          if (s.classifier) {
            s.classifierDivision = [s.classifier, division].join(":");
          }
          return s;
        }),
      s => s.classifierDivision,
    ).map(s => s.classifierDivision);
    const recHHFs = await RecHHFs.find({
      classifierDivision: { $in: lookupHHFs },
    }).lean();
    const recHHFsMap = recHHFs.reduce((acc, cur) => {
      acc[cur.classifierDivision] = cur;
      return acc;
    }, {});

    // final score prep
    const hydratedScores = scores.map((c, index, all) => {
      c.division = division;
      if (!c.sd) {
        c.sd = new Date(now.getTime() + 1000 * (all.length - index)).toISOString();
      }
      if (c.classifier) {
        c.classifierDivision = [c.classifier, division].join(":");
      }

      const recHHF = recHHFsMap[c.classifierDivision];
      if (recHHF) {
        c.recPercent = (100 * c.hf) / recHHF.recHHF;
        c.curPercent = (100 * c.hf) / recHHF.curHHF;
      } else {
        console.error(`No RecHHF for ${c.classifierDivision}`);
      }
      return c;
    });
    const existingRecScores = await scoresForRecommendedClassification([memberNumber]);
    const existingScores = await allDivisionsScores([memberNumber]);
    const recScores = dedupeGrandbagging(hydratedScores);
    const otherDivisionsScores = existingScores.filter(s => s.division !== division);
    const recPercentClassification = calculateUSPSAClassification(
      recScores,
      "recPercent",
      now,
      "brutal",
      classificationDifficulty.window.min,
      classificationDifficulty.window.best,
      classificationDifficulty.window.recent,
      classificationDifficulty.percentCap,
    );
    const curPercentClassification = calculateUSPSAClassification(
      [...hydratedScores, ...otherDivisionsScores],
      "curPercent",
      now,
      "uspsa",
      4,
      6,
      8,
      100,
    );

    return {
      scoresByDate: recScores.map(({ hf, classifier, recPercent, sd }) => ({
        hf,
        classifier,
        recPercent,
        sd,
      })),
      recHHFsMap,
      whatIf: {
        recPercent: recPercentClassification[division]?.percent,
        curPercent: curPercentClassification[division]?.percent,
      },
      scores: hydratedScores,
      existingRec: existingRecScores
        .filter(s => s.division === "co")
        .map(({ hf, classifier }) => ({ hf, classifier })),
      existing: existingScores
        .filter(s => s.division === "co")
        .map(({ hf, classifier }) => ({ hf, classifier })),
    };
  });
};

export default shootersRoutes;
