import uniqBy from "lodash.uniqby";
import {
  basicInfoForClassifier,
  classifiers,
} from "./dataUtil/classifiersData.js";
import { recommendedHHFFor } from "./dataUtil/recommendedHHF.js";
import sortedUniqBy from "lodash.sorteduniqby";
import transform from "lodash.transform";
import memoize from "memoize";

import {
  getDivShortToRuns,
  selectClassifierDivisionScores,
} from "./dataUtil/classifiersSource.js";
import { getShooterToCurPercentClassifications } from "./dataUtil/classifiers.js";
import { HF, N, Percent, PositiveOrMinus1 } from "./dataUtil/numbers.js";
import {
  getShooterFullInfo,
  getShootersTableByMemberNumber,
} from "./dataUtil/shooters.js";

import { stringSort } from "../../shared/utils/sort.js";

import { curHHFForDivisionClassifier, divShortToHHFs } from "./dataUtil/hhf.js";

export const chartData = async ({ number, division, full: fullString }) => {
  const full = Number(fullString);
  const runs = (
    await selectClassifierDivisionScores({
      number,
      division,
    })
  )
    .sort((a, b) => b.hf - a.hf)
    .filter(({ hf }) => hf > 0);

  const curPercentClsasifications = await getShootersTableByMemberNumber();
  const curHHFPercentClassifications =
    await getShooterToCurPercentClassifications();
  const hhf = curHHFForDivisionClassifier({ number, division });
  const allPoints = runs.map((run, index, allRuns) => ({
    x: HF(run.hf),
    y: PositiveOrMinus1(Percent(index, allRuns.length)),
    memberNumber: run.memberNumber,
    // historical (if possible) or current curHHFPercent of the shooter for dot color
    historicalCurHHFPercent:
      curHHFPercentClassifications[run.memberNumber]?.[
        division
      ]?.percentWithDates?.findLast(({ sd }) => {
        const runUnixTime = new Date(run.sd).getTime();
        const sdUnixTime = new Date(sd).getTime();
        return sdUnixTime < runUnixTime;
      })?.p || 0,
    // current curHHFPercent for secondary color
    curHHFPercent:
      curHHFPercentClassifications[run.memberNumber]?.[division]?.percent || 0,
    // alternative color curPercent official from USPSA
    curPercent:
      curPercentClsasifications[division]?.[run.memberNumber]?.[0].current || 0,
  }));

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

export const runsForDivisionClassifier = memoize(
  async ({ number, division, hhf, includeNoHF = false, hhfs }) => {
    const divisionClassifierRunsSortedByHFOrPercent = (
      await selectClassifierDivisionScores({ number, division, includeNoHF })
    ).sort((a, b) => {
      if (includeNoHF) {
        return b.percent - a.percent;
      }

      return b.hf - a.hf;
    });

    return await Promise.all(
      divisionClassifierRunsSortedByHFOrPercent.map(
        async (run, index, allRuns) => {
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
            ...(await getShooterFullInfo({ memberNumber, division })),
            historicalHHF: findHistoricalHHF ?? recalcHistoricalHHF,
            percent,
            curPercent,
            percentMinusCurPercent: percent >= 100 ? 0 : percentMinusCurPercent,
            place: index + 1,
            percentile: PositiveOrMinus1(Percent(index, allRuns.length)),
          };
        }
      )
    );
  },
  { cacheKey: (ehFuckit) => JSON.stringify(ehFuckit) }
);

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

export const extendedInfoForClassifier = memoize(
  async (c, division) => {
    if (!division) {
      return {};
    }
    const divisionHHFs = divShortToHHFs[division];
    const curHHFInfo = divisionHHFs.find((dHHF) => dHHF.classifier === c.id);

    const legacyScores = (await getDivShortToRuns())[division]
      .filter((run) => run?.classifier === c.classifier)
      .filter((run) => run.hf < 0); // NO HF = Legacy

    const hitFactorScores = (await getDivShortToRuns())[division]
      .filter((run) => run?.classifier === c.classifier)
      .filter((run) => run.hf >= 0) //  only classifer HF scores
      .sort((a, b) => b.hf - a.hf);

    const hhf = Number(curHHFInfo.hhf);

    const topXPercentileStats = (x) => ({
      [`top${x}PercentilePercent`]:
        hitFactorScores[Math.floor(x * 0.01 * hitFactorScores.length)].percent,
      [`top${x}PercentileCurPercent`]: Percent(
        hitFactorScores[Math.floor(x * 0.01 * hitFactorScores.length)].hf,
        hhf
      ),
      [`top${x}PercentileHF`]:
        hitFactorScores[Math.floor(x * 0.01 * hitFactorScores.length)].hf,
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
    const actualLastUpdate = hhfs[hhfs.length - 1].date;
    const clubs = uniqBy(hitFactorScores, "clubid")
      .map(({ clubid: id, club_name: name }) => ({
        id,
        name,
        label: id + " " + name,
      }))
      .sort((a, b) => stringSort(a, b, "id", 1));

    return {
      updated: curHHFInfo.updated, //actualLastUpdate, // before was using curHHFInfo.updated, and it's bs
      hhf,
      prevHHF: hhfs.findLast((c) => c.hhf !== hhf)?.hhf ?? hhf,
      hhfs,
      clubsCount: clubs.length,
      clubs,
      ...transform(
        calcRunStats(legacyScores),
        (r, v, k) => (r["runsTotals" + k] = v)
      ),
      ...transform(
        calcLegitRunStats(hitFactorScores, hhf),
        (r, v, k) => (r["runsTotalsLegit" + k] = v)
      ),
      runs: hitFactorScores.length,
      runsLegacy: legacyScores.length,
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
  },
  { cacheKey: ([c, division]) => c.classifier + ":" + division }
);

export const classifiersForDivision = memoize(
  async (division) => {
    const result = await Promise.all(
      classifiers.map(async (c) => {
        const hitFactorScores = (await getDivShortToRuns())[division]
          .filter((run) => run?.classifier === c.classifier)
          .filter((run) => run.hf >= 0) //  only classifer HF scores
          .sort((a, b) => b.hf - a.hf);
        const recHHF = await recommendedHHFFor({
          division,
          number: c.classifier,
        });
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
    return result;
  },
  { cacheKey: ([division]) => division }
);
