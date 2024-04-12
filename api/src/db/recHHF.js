import mongoose from "mongoose";

import { HF, Percent, PositiveOrMinus1 } from "../dataUtil/numbers.js";

import { Score } from "./scores.js";
import { curHHFForDivisionClassifier } from "../dataUtil/hhf.js";

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

  // if found percentile is higher (more people can achieve this result) than we need
  // to slightly increase the recommendation. If it's lower (less people) -- decrease it.
  const missCorrection =
    1 + (closestPercentileRun.percentile - targetPercentile) / 100;
  const percentScale = 1 / (percent / 100.0);

  return HF(closestPercentileRun.hf * missCorrection * percentScale);
};

const r1 = (runs) =>
  recommendedHHFByPercentileAndPercent(
    runs,
    1.0, // extendedCalibrationTable[division].pGM,
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
  "99-63",
  "03-09", // ON THE MOVE impossible to setup right, super easy to make much easier than designed
  "08-01",
];

// force classifier back into "no recommendation" mode to see all functions on its graph
// used for revising classifiers after r1-automatic-everything
const revise = () => 0;

// runs => recHHF function factory, this is where algos are chosen for classifiers/divisions
const decidedHHFFunctions = {
  opn: {
    "23-01": r1,
    "23-02": r1,

    "99-28": r5,
    "99-53": r5,
    "99-61": r5,
    "99-63": r5,
    "03-03": r15,
    "08-02": r15,
    "09-09": r5, // consider deprecation, too easy, probably doesn't scale right for open with same fixed time
  },
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
    "99-59": r1, // consider deprecation, hard for CBA
    "99-61": r5,
    "99-62": r1,
    "99-63": r1, // consider deprecattion, very hard for CBA

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

    "08-01": r1, // consider deprecation, hard for CBA
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

    "23-01": r1,
    "23-02": r1,
  },
  l10: {
    "23-01": r15, // barely any data, nobody shoots this div really
    "23-02": r15,

    "99-28": r1,
    "09-08": r5,
    "99-47": r5,
    "20-03": r5,
    "13-07": r5,
    "03-14": r5,
    "99-14": r5,
    "99-41": r5,
    "03-11": r1, // consider deprecation, too hard
    "09-07": r1,
    "06-01": r5,
    "99-19": r1,
    "18-09": r5,
    "03-08": r5,
    "09-13": r5,
    "18-05": r5,
    "99-21": r5,
    "09-03": r5,
    "09-04": r5,
    "06-05": r5,
    "03-04": r5,
    "13-02": r5,
    "18-06": r5,
    "99-48": r5,
    "06-10": r1,
    "20-01": r5,
    "99-23": r5,
    "06-04": r5,
    "03-18": r5,
    "13-06": r5,
  },
  prod: {
    "23-01": r1,
    "23-02": r5,

    "22-01": r5,
    "03-12": r5,
    "99-61": r5,
    "99-14": r1,
    "06-02": r5,
    "99-63": r5,
    "18-01": r5,
    "18-02": r1,
    "18-05": r5,
    "03-09": r5,
    "08-01": r5,
    "09-07": r1,
    "03-02": r1,
    "13-02": r1,
    "99-59": r5,
  },
  rev: {
    "23-01": r5,
    "23-02": r5,
  },
  ss: {
    "23-01": r1,
    "23-02": r5,

    "99-59": r5,
    "03-05": r5,
    "03-14": r5,
    "06-02": r5,
    "08-01": r5,
    "03-09": r5,
    "13-02": r5,
    "09-02": r5,
    "99-07": r5,
    "09-14": r1,
    "03-03": r5,
    "13-07": r5,
    "13-08": r5,
    "99-14": r5,
    "99-33": r15,
    "03-11": r5,
    "99-48": r5,
    "03-12": r5,
    "06-10": r5,
    "18-01": r5,
    "18-06": r1,
    "99-47": r5,
  },
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
    "99-51": r15,
    "99-53": r15,
    "99-56": r5,
    "99-57": r5,
    "99-59": r5,
    "99-61": r5,
    "99-62": r1,
    "99-63": r1, // consider deprecattion, very hard for CB, hard for AM

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

    "08-01": r1, // consider deprecation, hard for CBA
    "08-02": r5,
    "08-03": r1,

    "09-01": r5,
    "09-02": r1,
    "09-03": r1,
    "09-04": r1,
    "09-07": r1,
    "09-08": r5,
    "09-09": r5, // TODO: double checked, still closest is r1
    "09-10": r5,
    "09-13": r5,
    "09-14": r5,

    "13-01": r1,
    "13-02": r5,
    "13-03": r5,
    "13-04": r5,
    "13-05": r1,
    "13-06": r1,
    "13-07": r1, // TODO: changed to r1 check
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

    "23-01": r5,
    "23-02": r5,
  },
  lo: {
    "23-01": r1,
    "23-02": r5,
    "99-33": r5,
    "09-09": r15,
    "99-56": r15,
    "03-14": r5,
  },
  pcc: {
    "99-14": r5, // should be either deprecated, modified, or enjoy your 85% max with all the points
    "09-02": r5,
    "18-04": r5,
    "09-09": r5,
    "99-40": r5,
    "03-14": r5,
    "22-05": r5,
    "09-01": r5,
    "09-10": r15,
    "99-51": r15,
    "22-01": r5,
    "23-01": r1,
    "23-02": r15,
  },
};

// First manual recHHF Function review notes:
// TODO: re-review after the percentile miss bugfix
//
// The truth for CO is somewhere between 1%/GM and 5%/M for enough data and normal risk stages.
// 15% and A is where graph usually goes linear and it skews things, so it has to be used only
// when there is serious lack of data, or it looks super fucky.
const recommendedHHFFunctionFor = ({ division, number }) => {
  const decided = decidedHHFFunctions[division]?.[number];
  if (decided) {
    return decided;
  }

  // Not enough data for revolver in ANY of the classifiers, drop to r5 for defaults
  if (division === "rev") {
    return r5;
  }

  // default to r1 for no special decision, it's often very close now after the fix
  return r1;
};

const runsForRecs = async ({ division, number }) =>
  (await Score.find({ classifier: number, division }).limit(0))
    .map((doc) => doc.toObject())
    .map((c) => {
      c.hf = c.hf ?? 0;
      return c;
    })
    .sort((a, b) => b.hf - a.hf)
    .map((run, index, allRuns) => ({
      ...run,
      percentile: PositiveOrMinus1(Percent(index, allRuns.length)),
    }));

export const recommendedHHFFor = async ({ division, number }) =>
  recommendedHHFFunctionFor({ division, number })(
    await runsForRecs({ division, number })
  );

const RecHHFSchema = new mongoose.Schema({
  classifier: String,
  division: String,
  recHHF: Number,
  rec1HHF: Number,
  rec5HHF: Number,
  rec15HHF: Number,
});

RecHHFSchema.index({ classifier: 1, division: 1 }, { unique: true });

export const RecHHF = mongoose.model("RecHHF", RecHHFSchema);

export const hydrateRecHHF = async () => {
  await RecHHF.collection.drop();
  console.log("hydrating recommended HHFs");
  console.time("recHHFs");
  const divisions = (await Score.find().distinct("division")).filter(Boolean);
  const classifers = (await Score.find().distinct("classifier")).filter(
    Boolean
  );
  console.log(
    `Divisions: ${divisions.length}, Classifiers: ${classifers.length}`
  );

  let i = 1;
  const total = divisions.length * classifers.length;
  for (const division of divisions) {
    for (const classifier of classifers) {
      const allRuns = await runsForRecs({ division, number: classifier });
      const recHHF = recommendedHHFFunctionFor({
        division,
        number: classifier,
      })(allRuns);
      const rec1HHF = r1(allRuns);
      const rec5HHF = r5(allRuns);
      const rec15HHF = r15(allRuns);
      const curHHF = curHHFForDivisionClassifier({
        division,
        number: classifier,
      });
      await Promise.all([
        RecHHF.create({
          division,
          classifier,
          recHHF,
          rec1HHF,
          rec5HHF,
          rec15HHF,
        }),
        Score.updateMany(
          { division, classifier },
          { recHHF, rec1HHF, rec5HHF, rec15HHF, curHHF }
        ),
      ]);
      process.stdout.write(`\r${i}/${total}`);
      ++i;
    }
  }

  console.timeEnd("recHHFs");
};
