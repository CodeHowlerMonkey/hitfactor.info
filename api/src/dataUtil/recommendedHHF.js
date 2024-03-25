import memoize from "memoize";
import { HF, Percent, PositiveOrMinus1 } from "./numbers.js";
import { selectClassifierDivisionScores } from "./classifiersSource.js";

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
  if (!closestPercentileRun) {
    return 0;
  }

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
    4.75, // extendedCalibrationTable[division].pM,
    85
  );

const r15 = (runs) =>
  recommendedHHFByPercentileAndPercent(
    runs,
    14.5, // extendedCalibrationTable[division].pA,
    75
  );

// TODO: ignore these maybe in classification calculation?
const recommendedDeprecatedClassifiers = [
  "99-63", // chaos on graphs
  "03-09", // ON THE MOVE impossible to setup right, super easy to make much easier than designed
  "99-51", // flat graph
  "08-01",
];

// runs => recHHF function factory, this is where algos are chosen for classifiers/divisions
const decidedHHFFunctions = {
  opn: {},
  ltd: {
    "99-02": r5,
    "99-07": r5,
    "99-08": r5,
    "99-10": r1,
    "99-11": r1,
    "99-12": r5,
    "99-13": r1,
    "99-14": r1,
    "99-16": r5,
    "99-19": r5,
    "99-21": r1,
    "99-22": r1,
    "99-23": r1,
    "99-24": r5,
    "99-28": r5,
    "99-33": r5,
    "99-40": r5,
    "99-41": r5,
    "99-42": r5,
    "99-46": r5,
    "99-47": r5,
    "99-48": r1,
    "99-51": r5,
    "99-53": r5,
    "99-56": r5,
    "99-57": r5,
    "99-59": r1, // consider deprecation
    "99-61": r5,
    "99-62": r1,
    "99-63": r1, // should be thrown the fuck away, complete chaos on graphs

    "03-02": r1,
    "03-03": r5,
    "03-04": r5,
    "03-05": r5,
    "03-07": r5,
    "03-08": r1,
    "03-09": r1,
    "03-11": r1,
    "03-12": r5,
    "03-14": r1,
    "03-18": r1,

    "06-01": r5,
    "06-02": r5,
    "06-03": r5,
    "06-04": r1,
    "06-05": r5,
    "06-06": r5,
    "06-10": r1,

    "08-01": r1, // linear graph, old classifier, deprecation recommended
    "08-02": r5,
    "08-03": r1,

    "09-01": r5,
    "09-02": r1,
    "09-03": r5,
    "09-04": r1,
    "09-07": r1,
    "09-08": r5,
    "09-09": r1,
    "09-10": r5,
    "09-13": r5,
    "09-14": r5,

    "13-01": r1,
    "13-02": r1,
    "13-03": r5,
    "13-04": r1,
    "13-05": r1,
    "13-06": r5,
    "13-07": r5,
    "13-08": r1,

    "18-01": r1,
    "18-02": r1,
    "18-03": r5,
    "18-04": r1,
    "18-05": r1,
    "18-06": r1,
    "18-07": r1,
    "18-08": r5,
    "18-09": r5,

    "19-01": r5,
    "19-02": r5,
    "19-03": r1,
    "19-04": r5,

    "20-01": r5,
    "20-02": r1,
    "20-03": r5,

    "21-01": r5,

    "22-01": r5,
    "22-02": r5,
    "22-04": r5,
    "22-05": r5,
    "22-06": r5,
    "22-07": r5,

    "23-01": r15, // TODO: revise when more data is available
    "23-02": r15, // TODO: revise when more data is available
  },
  l10: {},
  prod: {},
  rev: {},
  ss: {},
  co: {
    "99-02": r5,
    "99-07": r1,
    "99-08": r1,
    "99-10": r15,
    "99-11": r1,
    "99-12": r5,
    "99-13": r1,
    "99-14": r5,
    "99-16": r15,
    "99-19": r5,
    "99-21": r5,
    "99-22": r5,
    "99-23": r5,
    "99-24": r1,
    "99-28": r5,
    "99-33": r15,
    "99-40": r5,
    "99-41": r5,
    "99-42": r15,
    "99-46": r5,
    "99-47": r5,
    "99-48": r5,
    "99-51": r15, // recommended deprecation
    "99-53": r15,
    "99-56": r5,
    "99-57": r5,
    "99-59": r5,
    "99-61": r5,
    "99-62": r1,
    "99-63": r1, // should be thrown the fuck away, complete chaos on graphs

    "03-02": r1,
    "03-03": r5,
    "03-04": r1,
    "03-05": r15,
    "03-07": r1,
    "03-08": r1,
    "03-09": r1,
    "03-11": r5,
    "03-12": r5,
    "03-14": r15,
    "03-18": r5,

    "06-01": r1,
    "06-02": r5,
    "06-03": r5,
    "06-04": r5,
    "06-05": r5,
    "06-06": r5,
    "06-10": r5,

    "08-01": r1, // linear graph, old classifier, deprecation recommended
    "08-02": r5,
    "08-03": r1,

    "09-01": r5,
    "09-02": r1,
    "09-03": r1,
    "09-04": r1,
    "09-07": r1,
    "09-08": r5,
    "09-09": r1, // double checked, still closest is r1
    "09-10": r5,
    "09-13": r5,
    "09-14": r5,

    "13-01": r1,
    "13-02": r5,
    "13-03": r5,
    "13-04": r5,
    "13-05": r1,
    "13-06": r1,
    "13-07": r15, // TODO: review for cheaters
    "13-08": r5,

    "18-01": r5,
    "18-02": r1,
    "18-03": r1,
    "18-04": r5,
    "18-05": r1,
    "18-06": r1, // double checked, closest is r1 still
    "18-07": r1,
    "18-08": r1,
    "18-09": r1,

    "19-01": r5,
    "19-02": r1,
    "19-03": r5,
    "19-04": r5,

    "20-01": r1,
    "20-02": r5,
    "20-03": r15,

    "21-01": r5,

    "22-01": r5,
    "22-02": r5,
    "22-04": r1, // wow, super calibrated to r1
    "22-05": r5,
    "22-06": r5,
    "22-07": r1,

    "23-01": r15, // TODO: revise when more data is available
    "23-02": r15, // TODO: revise when more data is available
  },
  lo: {},
  pcc: {},
};

// First manual recHHF Function review notes:
//
// The truth for CO is somewhere between 1%/GM and 5%/M for enough data and normal risk stages.
// 15% and A is where graph usually goes linear and it skews things, so it has to be used only
// when there is serious lack of data, or it looks super fucky.
const recommendedHHFFunctionFor = ({ division, number }) => {
  const decided = decidedHHFFunctions[division]?.[number];
  if (decided) {
    return decided;
  }

  // disable recHHF if not manually reviewed
  return () => 0;
};

export const recommendedHHFFor = memoize(
  ({ division, number }) => {
    const runs = selectClassifierDivisionScores({
      number,
      division,
      includeNoHF: false,
    })
      .sort((a, b) => b.hf - a.hf)
      .map((run, index, allRuns) => ({
        ...run,
        percentile: PositiveOrMinus1(Percent(index, allRuns.length)),
      }));

    return recommendedHHFFunctionFor({ division, number })(runs);
  },
  ([{ division, number }]) => division + "/" + number
);
