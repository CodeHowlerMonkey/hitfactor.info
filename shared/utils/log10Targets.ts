interface ScoreWithHF {
  hf: number;
}

type Target = [number, number];

// Original 1/5/15 targets HFI used for RecHHFs
export const coTargetsHFI: Target[] = [
  [0.01, 0.95],
  [0.05, 0.85],
  [0.15, 0.75],
];

/**
 * Latest "arbitrary difficuly should stay the same" targets from aligning
 * Weibulls of CO classifiers to curHHF.
 */
export const coTargetsFromKirt: Target[] = [
  [0.0137, 0.95],
  [0.03, 0.9],
  [0.0589, 0.85],
  [0.1697, 0.75],
];

export const log10TargetsHHF = (
  data: ScoreWithHF[] | null,
  targets: Target[] = coTargetsHFI,
  stepSize: number = 0.0001,
) => {
  if (!data?.length) {
    return 0;
  }
  const hfData = data.map(c => c.hf).sort((a, b) => b - a);
  const maxHF = hfData[0];
  const nAll = hfData.length;
  const findIndexOrLength = (a: number[], cb: (c: number) => boolean) => {
    const index = a.findIndex(cb);
    if (index < 0) {
      return a.length;
    }
    return index;
  };
  const lossFn = (hhfCandidate: number) => {
    const percentiles = targets.map(c => c[0]);
    const numbersInPercentiles = targets.map(curTarget =>
      findIndexOrLength(hfData, c => c < curTarget[1] * hhfCandidate),
    );

    const subError = (num: number, targetNum: number) =>
      Math.abs(Math.log10(num / nAll / targetNum));

    return numbersInPercentiles.reduce(
      (acc, c, i) => acc + subError(c, percentiles[i]),
      0,
    );
  };

  let minLoss = Number.MAX_VALUE;
  let bestHHF = maxHF;
  for (let maybeNewHHF = maxHF; maybeNewHHF > 0; maybeNewHHF -= stepSize) {
    const newLoss = lossFn(maybeNewHHF);
    if (newLoss < minLoss) {
      bestHHF = maybeNewHHF;
      minLoss = newLoss;
    }
  }
  return bestHHF;
};
