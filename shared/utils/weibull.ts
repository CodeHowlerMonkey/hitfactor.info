import throttle from "lodash.throttle";
import * as ss from "simple-statistics";

import { Percent } from "../../api/src/dataUtil/numbers";

export const DEFAULT_PRECISION = 8;

export interface WeibullResult {
  k: number;
  lambda: number;
  loss: number;
  /*
  cdf: (x: number) => number;
  reverseCDF: (y: number) => number;
  */
  hhf1: number;
  hhf5: number;
  hhf15: number;

  skewness: number;
  kurtosis: number;

  meanSquaredError: number;
  meanAbsoluteError: number;
  superMeanSquaredError: number; // MSE but k=3.6
  superMeanAbsoluteError: number; // MAE but k=3.6
  maxError: number;
}

export const emptyWeibull: WeibullResult = {
  k: 1,
  lambda: 1,
  loss: 0,
  /*
  cdf: () => 0,
  reverseCDF: () => 0,
  */
  hhf1: 0,
  hhf5: 0,
  hhf15: 0,

  skewness: 0,
  kurtosis: 0,

  meanAbsoluteError: 0,
  meanSquaredError: 0,
  superMeanAbsoluteError: 0,
  superMeanSquaredError: 0,
  maxError: 0,
};

/**
 * Factory for solved Weibull Cumulative Distribution Function
 *
 * Returns a function that accepts a number datapoint and returns a predicted top rank %
 * (ranges from 0 to 100, with 0 being the best score, 100 the worst )
 */
export const weibulCDFFactory = (k: number, lambda: number) => (x: number) =>
  100 - 100 * (1 - Math.exp(-Math.pow(x / lambda, k)));

type NumberTuple = [number, number];
type NumberTruple = [number, number, number];
const optimize = (
  lossFn: ([k, lambda]: NumberTuple) => number,
  start,
  precision = DEFAULT_PRECISION,
  partialCb?: (partial: NumberTruple) => void,
) => {
  const throttledCb = throttle(partialCb ?? (() => {}), 250);
  let bestParams: NumberTuple = start;
  let bestLoss = lossFn(start);
  const step = 0.05 / precision;
  for (let i = 0; i <= 8 * precision; i++) {
    for (let j = 0; j <= 8 * precision; j++) {
      const directionI = i % 2 !== 0 ? -1 : +1;
      const directionJ = j % 2 !== 0 ? -1 : +1;
      const testParams: NumberTuple = [
        bestParams[0] + directionI * Math.floor(i / 2) * step,
        bestParams[1] + directionJ * Math.floor(j / 2) * step,
      ];
      const loss = lossFn(testParams);
      if (loss < bestLoss) {
        throttledCb?.([...testParams, loss]);
        bestLoss = loss;
        bestParams = testParams;
        i = Math.floor(i / 2);
        j = Math.floor(j / 2);
      }
    }
  }
  throttledCb([...bestParams, bestLoss]);
  throttledCb.flush();
  throttledCb.cancel();
  return [...bestParams, bestLoss];
};

const probabilityDistributionFn = (x: number, k: number, lambda: number): number =>
  (k / lambda) * Math.pow(x / lambda, k - 1) * Math.exp(-Math.pow(x / lambda, k));

const lossFnFactory =
  (data: number[]) =>
  ([k, lambda]: NumberTuple) =>
    data.reduce(
      (sum, x) => sum - Math.log(probabilityDistributionFn(x, k, lambda) || 1e-10),
      0,
    );

const findParams = (
  data: number[],
  precision: number,
  partialCb?: (params: number[]) => void,
) => {
  if (!data.length) {
    return [1, 1];
  }
  const mean = ss.mean(data);
  // const variance = ss.variance(data);

  return optimize(
    lossFnFactory(data),
    // [mean ** 2 / variance, mean],
    // [3.6, 60],
    [3.6, mean],
    precision,
    partialCb,
  );
};

/**
 * Fits Weibull distribution to provided dataset and returns an bucket of stuff:
 *  - Cumulative Distribution Function y(x) and it's reverse x(y)
 *  - fitted k & lambda params for Weibull Distribution
 *  - Recommended HHFs, using 99th/95%, 95th/85% and 85th/75% targets
 *
 * @param dataPoints array of hit-factor scores
 *
 * @param precision positive integer, the square of this number controls the
 * number of iterations when optimizing weibull params trying to minimize loss.
 */
export const solveWeibull = (
  dataPoints: number[],
  precision: number = DEFAULT_PRECISION,
  partialResultCb?: (partial: WeibullResult) => void,
): WeibullResult => {
  if (!dataPoints.length) {
    return emptyWeibull;
  }
  const [k, lambda, loss] = findParams(
    dataPoints,
    precision,
    partialResultCb
      ? ([pK, pLambda, pLoss]) =>
          partialResultCb({
            ...emptyWeibull,
            k: pK,
            lambda: pLambda,
            loss: pLoss,
          })
      : undefined,
  );

  // const cdf = x => 100 - 100 * (1 - Math.exp(-Math.pow(x / lambda, k)));
  const reverseCDF = y => lambda * Math.pow(Math.log(100 / y), 1 / k);
  const hhf1 = reverseCDF(1) / 0.95;
  const hhf5 = reverseCDF(5) / 0.85;
  const hhf15 = reverseCDF(15) / 0.75;
  const skew = skewness(dataPoints);
  const kurt = kurtosis(dataPoints);
  const mse = meanSquaredError(dataPoints, k, lambda);
  const mae = meanAbsoluteError(dataPoints, k, lambda);
  const smse = meanSquaredError(dataPoints, 3.6, lambda);
  const smae = meanAbsoluteError(dataPoints, 3.6, lambda);
  const me = maximumError(dataPoints, k, lambda);

  return {
    k,
    lambda,
    loss,
    /*cdf, reverseCDF,*/ hhf1,
    hhf5,
    hhf15,
    skewness: skew,
    kurtosis: kurt,
    meanSquaredError: mse,
    meanAbsoluteError: mae,
    superMeanSquaredError: smse,
    superMeanAbsoluteError: smae,
    maxError: me,
  };
};

export const skewness = (dataPoints: number[]) => {
  if (dataPoints.length < 3) {
    return 0;
  }
  return ss.sampleSkewness(dataPoints);
};

export const kurtosis = (dataPoints: number[]) => {
  if (dataPoints.length < 4) {
    return 0;
  }
  return ss.sampleKurtosis(dataPoints);
};

export const correlation = ss.sampleCorrelation;
export const covariance = ss.sampleCovariance;

export const meanAbsoluteError = (dataPoints: number[], k: number, lambda: number) => {
  const cdf = weibulCDFFactory(k, lambda);
  const data = dataPoints
    .toSorted((a, b) => b - a)
    .map((x, i, all) => ({ x, y: Percent(i, all.length) }));
  return data.reduce((acc, c) => acc + Math.abs(c.y - cdf(c.x)), 0) / data.length;
};

export const meanSquaredError = (dataPoints: number[], k: number, lambda: number) => {
  const cdf = weibulCDFFactory(k, lambda);
  const data = dataPoints
    .toSorted((a, b) => b - a)
    .map((x, i, all) => ({ x, y: Percent(i, all.length) }));
  return data.reduce((acc, c) => acc + Math.pow(c.y - cdf(c.x), 2), 0) / data.length;
};

export const maximumError = (dataPoints: number[], k: number, lambda: number) => {
  const cdf = weibulCDFFactory(k, lambda);
  const data = dataPoints
    .toSorted((a, b) => b - a)
    .map((x, i, all) => ({ x, y: Percent(i, all.length) }));
  return data.reduce((acc, c) => {
    const error = Math.abs(cdf(c.x) - c.y);
    return error > acc ? error : acc;
  }, 0);
};
