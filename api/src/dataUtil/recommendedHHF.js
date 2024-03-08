import memoize from "memoize";
import { HF, Percent, PositiveOrMinus1 } from "./numbers.js";
import { selectClassifierDivisionScores } from "./classifiers.js";

/**
 * Calculated recommended HHF by matching lower percent of the score to percentile of shooters
 * who should be able to get that score.
 *
 * Used with approx. 1Percentile for GM (95%) and 5Percentile for M(85%)
 * @param runs classifier scores, sorted by HF or curPercent. MUST BE SORTED for percentile math.
 * @param percentile what percentile to search for 0 to 100
 * @param percent what percent score to assign to it 0 to 100
 *
 * @todo un-export
 */
export const recommendedHHFByPercentileAndPercent = (
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

const r1 = (runs) =>
  recommendedHHFByPercentileAndPercent(
    runs,
    0.9, // extendedCalibrationTable[division].pGM,
    95
  );

const r5 = (runs) =>
  recommendedHHFByPercentileAndPercent(
    runs,
    5.1, // extendedCalibrationTable[division].pM,
    85
  );

const r15 = (runs) =>
  recommendedHHFByPercentileAndPercent(
    runs,
    14.5, // extendedCalibrationTable[division].pA,
    75
  );

// runs => recHHF function factory, this is where algos are chosen for classifiers/divisions
const decidedHHFFunctions = {
  opn: {},
  ltd: {},
  l10: {},
  prod: {},
  rev: {},
  ss: {},
  co: {
    "20-01": r1,
    "22-02": r5,
  },
  lo: {},
  pcc: {},
};

const recommendedHHFFunctionFor = ({ division, number }) => {
  const decided = decidedHHFFunctions[division]?.[number];
  if (decided) {
    return decided;
  }

  // r1 (0.9th === 95%) is default
  return r1;
};

export const recommendedHHFFor = memoize(
  async ({ division, number }) => {
    const runs = (
      await selectClassifierDivisionScores({
        number,
        division,
        includeNoHF: false,
      })
    )
      .sort((a, b) => b.hf - a.hf)
      .map((run, index, allRuns) => ({
        ...run,
        percentile: PositiveOrMinus1(Percent(index, allRuns.length)),
      }));

    return recommendedHHFFunctionFor({ division, number })(runs);
  },
  ([{ division, number }]) => division + "/" + number
);
