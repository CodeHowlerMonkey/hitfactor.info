import _ from "lodash";
import memoize from "memoize";

import opn from "../../data/merged.active.open.json" assert { type: "json" };
import limited1 from "../../data/merged.active.limited.1.json" assert { type: "json" };
import limited2 from "../../data/merged.active.limited.2.json" assert { type: "json" };
import l10 from "../../data/merged.active.limited10.json" assert { type: "json" };
import prod from "../../data/merged.active.production.json" assert { type: "json" };
import ss from "../../data/merged.active.singlestack.json" assert { type: "json" };
import rev from "../../data/merged.active.revolver.json" assert { type: "json" };
import co from "../../data/merged.active.co.json" assert { type: "json" };
import lo from "../../data/merged.active.limitedoptics.json" assert { type: "json" };
import pcc from "../../data/merged.active.pcc.json" assert { type: "json" };

import { divIdToShort } from "./dataUtil/divisions.js";
import { shooterShortInfo } from "./dataUtil/shooters.js";

// fucking github and its fucking 50Mb file limitation
const ltd = [...limited1, ...limited2];

import classifiersData from "../../data/classifiers/classifiers.json" assert { type: "json" };
import allHHFs from "../../data/hhf.json" assert { type: "json" };

const divShortToRuns = {
  opn,
  ltd,
  l10,
  prod,
  ss,
  rev,
  co,
  lo,
  pcc,
  loco: [...co, ...lo],
};

export const curHHFForDivisionClassifier = ({ division, number }) => {
  const divisionHHFs = divShortToHHFs[division];
  const c = classifiersData.classifiers.find(
    (cur) => cur.classifier === number
  );
  const curHHFInfo = divisionHHFs.find((dHHF) => dHHF.classifier === c.id);
  return HF(curHHFInfo.hhf);
};

export const selectClassifierDivisionScores = ({
  number,
  division,
  includeNoHF,
}) => {
  return divShortToRuns[division].filter((run) => {
    if (!run) {
      return false;
    }

    if (!includeNoHF && run.hf < 0) {
      return false;
    }

    return run.classifier === number;
  });
};

export const chartData = ({ number, division, full: fullString }) => {
  const full = Number(fullString);
  const runs = selectClassifierDivisionScores({
    number,
    division,
  })
    .sort((a, b) => b.hf - a.hf)
    .filter(({ hf }) => hf > 0);

  const hhf = curHHFForDivisionClassifier({ number, division });
  const allPoints = runs.map((run, index, allRuns) => ({
    x: HF(run.hf),
    y: PositiveOrMinus1(Percent(index, allRuns.length)),
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
    ..._.uniqBy(
      other,
      ({ x }) => Math.floor((200 * x) / hhf) // 0.5% grouping for graph points reduction
    ),
  ];
};

export const runsForDivisionClassifier = memoize(
  ({ number, division, hhf, includeNoHF = false, hhfs }) => {
    const divisionClassifierRunsSortedByHFOrPercent =
      selectClassifierDivisionScores({ number, division, includeNoHF }).sort(
        (a, b) => {
          if (includeNoHF) {
            return b.percent - a.percent;
          }

          return b.hf - a.hf;
        }
      );

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
          ...shooterShortInfo({ memberNumber, division }),
          historicalHHF: findHistoricalHHF ?? recalcHistoricalHHF,
          percent,
          curPercent,
          percentMinusCurPercent: percent >= 100 ? 0 : percentMinusCurPercent,
          place: index + 1,
          percentile: PositiveOrMinus1(Percent(index, allRuns.length)),
        };
      }
    );
  },
  { cacheKey: (ehFuckit) => JSON.stringify(ehFuckit) }
);

const divShortToHHFs = allHHFs.hhfs.reduce((acc, cur) => {
  const divShortName = divIdToShort[cur.division];
  const curArray = acc[divShortName] || [];

  // TODO: merge HHF in a smart way
  let extra = {};
  if (divShortName === "lo") {
    extra = { loco: [...curArray, cur] };
  }

  return {
    ...acc,
    [divShortName]: [...curArray, cur],
    ...extra,
  };
}, {});

/** Number toFixed(2) float parser util */
const N = (arg, fix = 2) => Number(parseFloat(arg).toFixed(fix));
const HF = (arg) => N(arg, 4);
const Percent = (n, total) => N((100.0 * n) / total);
const PositiveOrMinus1 = (n) => (n >= 0 ? n : -1);

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
  (c, division) => {
    if (!division) {
      return {};
    }

    const divisionHHFs = divShortToHHFs[division];
    const curHHFInfo = divisionHHFs.find((dHHF) => dHHF.classifier === c.id);

    // sussy = include legacy scores without hfs
    const sussyRuns = divShortToRuns[division]
      .filter(Boolean)
      .filter((run) => run.classifier === c.classifier)
      .filter((run) => run.hf < 0) // NO HF = sussy baka
      .sort((a, b) => b.percent - a.percent); // DESC for sortedUniqBy to pick highest first
    const runsSortedByPercent = divShortToRuns[division]
      .filter(Boolean)
      .filter((run) => run.classifier === c.classifier)
      // .filter(run => run.hf >= 0) // sussy baka filter
      .sort((a, b) => {
        // try to sort with hf if possible, otherwise sussy sort it
        // Use DESC for sortedUniqBy to pick the highest unique (it picks first one, not last)
        if (a.hf >= 0 && b.hf >= 0) {
          return b.hf - a.hf;
        }
        return b.percent - a.percent;
      });

    // non-uniq, but with hf
    const runsSortedByHF = runsSortedByPercent
      .filter((s) => s.hf >= 0)
      .sort((a, b) => b.hf - a.hf);

    const runs = _.sortedUniqBy(runsSortedByPercent, (run) => run.memberNumber);

    const hhf = Number(curHHFInfo.hhf);

    const top20HF = runsSortedByHF.slice(0, 20);
    const top20CurPercent = top20HF.map((s) => Percent(s.hf, hhf));

    const topXPercentileStats = (x) => ({
      [`top${x}PercentilePercent`]:
        runsSortedByHF[Math.floor(x * 0.01 * runsSortedByHF.length)].percent,
      [`top${x}PercentileCurPercent`]: Percent(
        runsSortedByHF[Math.floor(x * 0.01 * runsSortedByHF.length)].hf,
        hhf
      ),
      [`top${x}PercentileHF`]:
        runsSortedByHF[Math.floor(x * 0.01 * runsSortedByHF.length)].hf,
    });

    const inversePercentileStats = (xPercent) => ({
      [`inverse${xPercent}CurPercentPercentile`]: Percent(
        runsSortedByHF.findLastIndex((c) => (100 * c.hf) / hhf >= xPercent),
        runsSortedByHF.length
      ),
    });

    // sik maf bro
    // historical high hit factors, N(x, 2) uniqueness, cause maf is hard on
    // computers and gets too much noise. If they changed HF <= 0.01 it doesn't
    // matter anyway, so toFixed(2)
    const hhfs = _.sortedUniqBy(
      runsSortedByHF
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

    return {
      updated: actualLastUpdate, // before was using curHHFInfo.updated, and it's bs
      hhf,
      hhfs,
      /* unused / not interesting data
      ..._.transform(
        calcRunStats(runs),
        (r, v, k) => (r["runsUnique" + k] = v)
      ),
      ..._.transform(
        calcRunStats(sussyRuns),
        (r, v, k) => (r["runsSussy" + k] = v)
      ),
      top20CurPercent,
      top20SussyPercent: runs.slice(0, 20).map((s) => s.percent),
      top20SussyHF: runs.slice(0, 20).map((s) => s.hf),
      top20CurPercent,
      top20CurPercentAvg: top20CurPercent.reduce((a, b) => a + b, 0) / 20,
      top20HF: top20HF.map((run) => run.hf),
      top10HFAvg: HF(
        runs
          .filter((s) => s.hf >= 0) // need to filter into non-sussy first for avg math
          .slice(0, 10)
          .map((s) => s.hf)
          .reduce((a, b) => a + b, 0) / 10
      ),
      top20HFAvg: HF(
        runs
          .filter((s) => s.hf >= 0) // need to filter into non-sussy first for avg math
          .slice(0, 20)
          .map((s) => s.hf)
          .reduce((a, b) => a + b, 0) / 20
      ),
*/
      ..._.transform(
        calcRunStats(runsSortedByPercent),
        (r, v, k) => (r["runsTotals" + k] = v)
      ),
      ..._.transform(
        calcLegitRunStats(runs, hhf),
        (r, v, k) => (r["runsTotalsLegit" + k] = v)
      ),
      runs: runsSortedByPercent.length,
      runsUniq: runs.length,
      runsNotUniq: runsSortedByPercent.length - runs.length,
      top10CurPercentAvg:
        top20CurPercent.slice(0, 10).reduce((a, b) => a + b, 0) / 10,
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

export const basicInfoForClassifier = (c) => ({
  id: c.id,
  code: c.classifier,
  name: c.name,
  scoring: c.scoring,
});

export const classifiers = classifiersData.classifiers;
/** whitelist for wsb downloads */
export const classifierNumbers = classifiers.map((cur) => cur.classifier);
