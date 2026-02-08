import sortedUniqBy from "lodash.sorteduniqby";
import uniqBy from "lodash.uniqby";

import { ScoresMode } from "@data/types/ScoresModes";
import { uspsaDivShortNames } from "@shared/constants/divisions";

import { calculateUSPSAClassification } from "../../../../../shared/classification/engine";
import { classificationDifficulty } from "../../../../../shared/constants/difficulty";
import { multisort, safeNumSort } from "../../../../../shared/utils/sort";
import { basicInfoForClassifierCode } from "../../../dataUtil/classifiersData";
import { scoresForMode } from "../../../db/matchScores";
import { RecHHFs } from "../../../db/recHHF";
import { scoresForDivisionForShooter, shooterScoresChartData } from "../../../db/scores";
import { Shooters, dedupeGrandbagging } from "../../../db/shooters";
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
      "reclassificationsRecPercentUncappedCurrent",
      "reclassificationsRecPercentUncappedHigh",
      "reclassificationsMajorsCurrent",
      "elo",
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
        memberNumber: { $not: /^X+$/i },
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

const reclassificationForProgressMode = async (
  mode: ScoresMode,
  memberNumber: string,
  division: string,
  uncapped: boolean = false,
) => {
  const now = new Date();
  const scores = await scoresForMode({ mode, memberNumbers: [memberNumber], division });
  return calculateUSPSAClassification(
    scores.map(cur => ({ ...cur, percent: cur.recPercent })),
    now,
    classificationDifficulty.window.min,
    classificationDifficulty.window.best,
    classificationDifficulty.window.recent,
    uncapped ? 150 : classificationDifficulty.percentCap,
  );
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

    // redirect helper for bad member numbers
    const dbInfo = infos.find(s => s.division === division);
    if (!dbInfo && memberNumber.match(/^(A|TY|FY)/)) {
      const memberNumberDigits = memberNumber.replace(/^(A|TY|FY)/, "");
      const alt = await Shooters.findOne({
        memberNumber: new RegExp(`${memberNumberDigits}$`),
      });
      if (alt) {
        return {
          info: {},
          classifiers: [],
          altMemberNumber: alt.memberNumber,
        };
      }
    }

    const info = { ...dbInfo } as Record<string, unknown>;
    info.classificationByDivision = infos.reduce((acc, cur) => {
      const {
        reclassificationsRecPercentUncappedCurrent: recCurrent,
        reclassificationsRecPercentUncappedHigh: recHigh,
        reclassificationsMajorsCurrent: majors,
        reclassificationsClassifiersCurrent: classifiers,
      } = cur;

      acc[cur.division] = {
        reclassificationsRecPercentUncappedCurrent: recCurrent || 0,
        reclassificationsRecPercentUncappedHigh: recHigh || 0,
        reclassificationsMajorsCurrent: majors || 0,
        reclassificationsClassifiersCurrent: classifiers || 0,
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

  fastify.get("/:division/:memberNumber/debug", async (req, res) => {
    // TODO: rename to LOCAL_ADMIN_TOOLS_ENABLED or something
    if (!process.env.ALLOW_MARK_BAD) {
      res.statusCode = 401;
      return { nuhUh: 1 };
    }

    const { division, memberNumber } = req.params;
    const reclass = await reclassificationForProgressMode(
      "combined",
      memberNumber,
      division,
      true,
    );

    return reclass;
  });

  fastify.get("/:division/:memberNumber/chart/progress/:mode", async req => {
    const { division, memberNumber, mode } = req.params;
    const reclass = await reclassificationForProgressMode(
      mode,
      memberNumber,
      division,
      true,
    );

    return Object.fromEntries(
      uspsaDivShortNames.map(div => [
        div,
        sortedUniqBy((reclass?.[div]?.percentWithDates || []).toReversed(), c =>
          c.sd.getTime(),
        )
          .toReversed()
          .filter(c => c.p > 0),
      ]),
    );
  });

  fastify.get("/:division/chart", async req => {
    const { division, postMegaDoc } = req.params;
    const { xMode, colorMode, mode } = req.query;
    const shootersTable = await Shooters.find({
      division,
      reclassificationsRecPercentUncappedCurrent: { $gt: 0 },
      ...(!postMegaDoc
        ? {}
        : { ageMaxDate: { $exists: true, $ne: null, $gte: new Date("2025-05-01") } }),
    })
      .select([
        "memberNumber",
        "reclassificationsRecPercentUncappedCurrent",
        "reclassificationsRecPercentUncappedHigh",
        "reclassificationsMajorsCurrent",
        "reclassificationsClassifiersCurrent",
        "elo",
        "current",
        "high",
      ])
      .lean()
      .limit(0);

    const mapped = shootersTable.map(c => ({
      recPercentUncapped: c.reclassificationsRecPercentUncappedCurrent,
      recPercentUncappedHigh: c.reclassificationsRecPercentUncappedHigh,
      majors: c.reclassificationsMajorsCurrent,
      classifiers: c.reclassificationsClassifiersCurrent,
      memberNumber: c.memberNumber,
      current: c.current,
      high: c.high,
    }));
    if (mode === "elo") {
      return mapped;
    }

    return mapped
      .filter(c => !!c[xMode] && !!c[colorMode])
      .sort(safeNumSort(xMode))
      .map((c, i, all) => ({
        ...c,
        x: c[xMode],
        y: (100 * i) / (all.length - 1),
      }))
      .filter(c => c.y > 0 && c.x > 0);
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
    const existingRecScores = await scoresForMode({
      mode: "combined",
      memberNumbers: [memberNumber],
      division,
    });
    const recScores = dedupeGrandbagging(hydratedScores);
    const recPercentClassification = calculateUSPSAClassification(
      recScores.map(cur => ({ ...cur, percent: cur.recPercent })),
      now,
      classificationDifficulty.window.min,
      classificationDifficulty.window.best,
      classificationDifficulty.window.recent,
      classificationDifficulty.percentCap,
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
      },
      scores: hydratedScores,
      existingRec: existingRecScores
        .filter(s => s.division === division)
        .map(({ hf, classifier }) => ({ hf, classifier })),
    };
  });
};

export default shootersRoutes;
