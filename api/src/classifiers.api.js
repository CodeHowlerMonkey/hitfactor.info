import uniqBy from "lodash.uniqby";
import {
  basicInfoForClassifier,
  classifiers,
} from "./dataUtil/classifiersData.js";
import sortedUniqBy from "lodash.sorteduniqby";
import transform from "lodash.transform";
import memoize from "memoize";

import {
  getDivShortToRuns,
  selectClassifierDivisionScores,
} from "./dataUtil/classifiersSource.js";
import { HF, N, Percent, PositiveOrMinus1 } from "./dataUtil/numbers.js";
import { getShooterFullInfo } from "./dataUtil/shooters.js";

import { stringSort } from "../../shared/utils/sort.js";

import { curHHFForDivisionClassifier, divShortToHHFs } from "./dataUtil/hhf.js";
import { Score } from "./db/scores.js";
import { Shooter } from "./db/shooters.js";
import { RecHHF } from "./db/recHHF.js";

export const chartData = async ({ number, division, full: fullString }) => {
  const full = Number(fullString);
  const [scores, memberNumbers] = await Promise.all([
    Score.find({ classifier: number, division }).limit(0),
    Score.find({ classifier: number, division }).distinct("memberNumber"),
  ]);

  const runs = scores
    .map((doc) => doc.toObject())
    .sort((a, b) => b.hf - a.hf)
    .filter(({ hf }) => hf > 0);

  const shooters = await Shooter.find({
    memberNumber: { $in: memberNumbers },
  }).limit(0);

  const hhf = curHHFForDivisionClassifier({ number, division });
  const allPoints = runs.map((run, index, allRuns) => {
    const shooter = shooters.find(
      (doc) => doc.memberNumber === run.memberNumber
    );

    return {
      x: HF(run.hf),
      y: PositiveOrMinus1(Percent(index, allRuns.length)),
      memberNumber: run.memberNumber,
      // percentages in classifier chart are used for colors
      // historical (if possible) or current curHHFPercent of the shooter for dot color
      historicalCurHHFPercent:
        shooter?.reclassificationsByCurPercent[
          division
        ].percentWithDates?.findLast(({ sd }) => {
          const runUnixTime = new Date(run.sd).getTime();
          const sdUnixTime = new Date(sd).getTime();
          return sdUnixTime < runUnixTime;
        })?.p || 0,
      curPercent: shooter?.current[division] || 0,
      curHHFPercent:
        shooter?.reclassificationsByCurPercent[division]?.percent || 0,
      recPercent:
        shooter?.reclassificationsByRecPercent[division]?.percent || 0,
    };
  });

  // for zoomed in mode return all points
  if (full === 1) {
    return allPoints;
  }

  // always return top 100 points, and reduce by 0.5% grouping for other to make render easier
  const first50 = allPoints.slice(0, 50);
  const other = allPoints.slice(50, allPoints.length);
  return [
    ...first50,
    ...uniqBy(
      other,
      ({ x }) => Math.floor((200 * x) / hhf) // 0.5% grouping for graph points reduction
    ),
  ];
};

export const runsForDivisionClassifier = async ({
  number,
  division,
  hhf,
  hhfs,
}) => {
  const scores = () => Score.find({ classifier: number, division });
  const divisionClassifierRunsSortedByHFOrPercent = (await scores().limit(0))
    .map((doc) => doc.toObject())
    .sort((a, b) => b.hf - a.hf);

  const memberNumbers = await scores().distinct("memberNumber");
  const shooterDocs = await Shooter.find({
    memberNumber: { $in: memberNumbers },
  })
    .limit(0)
    .select(["classifications", "high", "current", "memberNumber", "name"])
    .lean();

  const shooters = shooterDocs.map((doc) => ({
    class: doc.classifications[division],
    high: doc.high[division],
    current: doc.current[division],
    division,
    memberNumber: doc.memberNumber,
    name: doc.name,
  }));

  return divisionClassifierRunsSortedByHFOrPercent.map(
    (run, index, allRuns) => {
      const { memberNumber } = run;
      const percent = N(run.percent);
      const curPercent = PositiveOrMinus1(Percent(run.hf, hhf));
      const percentMinusCurPercent = N(percent - curPercent);

      const findHistoricalHHF = hhfs.findLast(
        (hhf) => hhf.date <= new Date(run.sd).getTime()
      )?.hhf;

      const recalcHistoricalHHF = HF((100 * run.hf) / run.percent);

      return {
        ...run,
        ...shooters.find((c) => c.memberNumber === memberNumber),
        historicalHHF: findHistoricalHHF ?? recalcHistoricalHHF,
        percent,
        curPercent,
        percentMinusCurPercent: percent >= 100 ? 0 : percentMinusCurPercent,
        place: index + 1,
        percentile: PositiveOrMinus1(Percent(index, allRuns.length)),
      };
    }
  );
};

const calcRunStats = (runs) =>
  runs.reduce(
    (acc, cur) => {
      if (cur.percent < 40) {
        acc.D += 1;
      } else if (cur.percent < 60) {
        acc.C += 1;
      } else if (cur.percent < 75) {
        acc.B += 1;
      } else if (cur.percent < 85) {
        acc.A += 1;
      } else if (cur.percent < 95) {
        acc.M += 1;
      } else if (cur.percent >= 95) {
        acc.GM += 1;
      }

      if (cur.percent >= 100) {
        acc.Hundo += 1;
      }

      return acc;
    },
    { D: 0, C: 0, B: 0, A: 0, M: 0, GM: 0, Hundo: 0, Total: runs.length }
  );
const calcLegitRunStats = (runs, hhf) =>
  runs.reduce(
    (acc, cur) => {
      const curFraction = cur.hf / hhf;
      if (curFraction < 0.4) {
        acc.D += 1;
      } else if (curFraction < 0.6) {
        acc.C += 1;
      } else if (curFraction < 0.75) {
        acc.B += 1;
      } else if (curFraction < 0.85) {
        acc.A += 1;
      } else if (curFraction < 0.95) {
        acc.M += 1;
      } else if (curFraction >= 0.95) {
        acc.GM += 1;
      }

      if (curFraction >= 1.0) {
        acc.Hundo += 1;
      }

      return acc;
    },
    { D: 0, C: 0, B: 0, A: 0, M: 0, GM: 0, Hundo: 0, Total: runs.length }
  );

export const extendedInfoForClassifier = async (c, division) => {
  if (!division) {
    return {};
  }
  const divisionHHFs = divShortToHHFs[division];
  const curHHFInfo = divisionHHFs.find((dHHF) => dHHF.classifier === c.id);

  const hitFactorScores = await Score.find({
    classifier: c.classifier,
    division,
    hf: { $gte: 0 },
  })
    .sort({ hf: -1 })
    .limit(0);

  const hhf = Number(curHHFInfo.hhf);

  const topXPercentileStats = (x) => ({
    [`top${x}PercentilePercent`]:
      hitFactorScores[Math.floor(x * 0.01 * hitFactorScores.length)]?.percent,
    [`top${x}PercentileCurPercent`]: Percent(
      hitFactorScores[Math.floor(x * 0.01 * hitFactorScores.length)]?.hf,
      hhf
    ),
    [`top${x}PercentileHF`]:
      hitFactorScores[Math.floor(x * 0.01 * hitFactorScores.length)]?.hf,
  });

  const inversePercentileStats = (xPercent) => ({
    [`inverse${xPercent}CurPercentPercentile`]: Percent(
      hitFactorScores.findLastIndex((c) => (100 * c.hf) / hhf >= xPercent),
      hitFactorScores.length
    ),
  });

  // sik maf bro
  // historical high hit factors, N(x, 2) uniqueness, cause maf is hard on
  // computers and gets too much noise. If they changed HF <= 0.01 it doesn't
  // matter anyway, so toFixed(2)
  const hhfs = sortedUniqBy(
    hitFactorScores
      .filter((run) => run.percent !== 0 && run.percent !== 100)
      .map((run) => ({
        date: new Date(run.sd).getTime(),
        sd: run.sd,
        hhf: HF((100 * run.hf) / run.percent),
      }))
      .sort((a, b) => a.date - b.date),
    (hhfData) => N(hhfData.hhf, 2)
  );
  const clubs = uniqBy(hitFactorScores, "clubid")
    .map(({ clubid: id, club_name: name }) => ({
      id,
      name,
      label: id + " " + name,
    }))
    .sort((a, b) => stringSort(a, b, "id", 1));

  const result = {
    updated: curHHFInfo.updated, //actualLastUpdate, // before was using curHHFInfo.updated, and it's bs
    hhf,
    prevHHF: hhfs.findLast((c) => c.hhf !== hhf)?.hhf ?? hhf,
    hhfs,
    clubsCount: clubs.length,
    clubs,
    ...transform(
      calcLegitRunStats(hitFactorScores, hhf),
      (r, v, k) => (r["runsTotalsLegit" + k] = v)
    ),
    runs: hitFactorScores.length,
    top10CurPercentAvg:
      hitFactorScores
        .slice(0, 10)
        .map((s) => Percent(s.hf, hhf))
        .reduce((a, b) => a + b, 0) / 10,
    ...topXPercentileStats(1),
    ...topXPercentileStats(2),
    ...topXPercentileStats(5),
    ...inversePercentileStats(100),
    ...inversePercentileStats(95),
    ...inversePercentileStats(85),
    ...inversePercentileStats(75),
    ...inversePercentileStats(60),
    ...inversePercentileStats(40),
  };
  return result;
};

// TODO: refactor to another pre-hydrated mongo collection
// TODO: first refactor extendedInfoForClassifier there
export const classifiersForDivision = async (division) => {
  /*
  const [divRecHFFs, divScores] = await Promise.all([
    RecHHF.find({ division })
      .select(["division", "classifier", "recHHF"])
      .lean()
      .limit(0),
    Score.find({ division, hf: { $gte: 0 } })
      .allowDiskUse(true)
      .sort({ hf: -1 })
      .limit(0),
  ]);*/
  const divRecHFFs = await RecHHF.find({ division })
    .select(["division", "classifier", "recHHF"])
    .lean()
    .limit(0);
  const divScores = await Score.find({ division, hf: { $gte: 0 } })
    .allowDiskUse(true)
    .sort({ hf: -1 })
    .limit(0);

  return await Promise.all(
    classifiers.map(async (c) => {
      const hitFactorScores = divScores.filter(
        (run) => run?.classifier === c.classifier
      );
      const recHHF = divRecHFFs.find(
        (r) => r.classifier === c.classifier
      )?.recHHF;
      const inverseRecPercentileStats = (xPercent) => ({
        [`inverse${xPercent}RecPercentPercentile`]: Percent(
          recHHF > 0
            ? hitFactorScores.findLastIndex(
                (c) => (100 * c.hf) / recHHF >= xPercent
              )
            : -1,
          hitFactorScores.length
        ),
      });
      return {
        ...basicInfoForClassifier(c),
        ...(await extendedInfoForClassifier(c, division)),
        recHHF,
        ...inverseRecPercentileStats(100),
        ...inverseRecPercentileStats(95),
        ...inverseRecPercentileStats(85),
        ...inverseRecPercentileStats(75),
      };
    })
  );
};
