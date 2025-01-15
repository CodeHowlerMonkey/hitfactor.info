import throttle from "lodash.throttle";
import * as ss from "simple-statistics";

import { Percent } from "../../api/src/dataUtil/numbers";

export const DEFAULT_PRECISION = 8;

type OptimizationMethod = "bad" | "neldermead";

export interface WeibullResult {
  k: number;
  lambda: number;
  loss: number;
  meanLL: number; // mean log likelyhood
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
  meanLL: 0,
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
  ([k, lambda]: number[]) =>
    data.reduce(
      (sum, x) => sum - Math.log(probabilityDistributionFn(x, k, lambda) || 1e-10),
      0,
    );

const findParams = (
  data: number[],
  precision: number,
  partialCb?: (params: number[]) => void,
  method: OptimizationMethod = "bad",
) => {
  if (!data.length) {
    return [1, 1];
  }

  // initial guesses
  const k = 3.6;
  const lambda = ss.median(data) / Math.log(2) ** (1 / k);

  if (method === "neldermead") {
    return optimizeNelderMead(lossFnFactory(data), [k, lambda], 1e-16, partialCb);
  }

  return optimize(lossFnFactory(data), [3.6, ss.mean(data)], precision, partialCb);
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
  method: OptimizationMethod = "bad",
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
    method,
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
    meanLL: -loss / dataPoints.length,
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

const _matrixAdd = (a: number[], b: number[]): number[] => a.map((c, i) => c + b[i] || 0);
const _matrixSubtract = (a: number[], b: number[]): number[] =>
  a.map((c, i) => c - b[i] || 0);
const _matrixMultiply = (a: number, b: number[]): number[] => b.map(c => c * a);
const _numpyMeanZeroAxis = (a: number[][]): number[] =>
  a.reduce((acc, c) => _matrixAdd(acc, c)).map(c => c / a.length);

const optimizeNelderMead = (
  lossFn: (variables: number[]) => number,
  initialVariables: number[],
  tolerance: number = 1e-15,
  partialCb?: (partialResults: number[]) => void,
) => {
  const throttledCb = throttle(partialCb ?? (() => {}), 250);
  const nParams = initialVariables.length;
  const nVertices = nParams + 1;

  const simplex = new Array(nVertices).fill(new Array(nParams));
  simplex[0] = [...initialVariables];
  for (let i = 1; i < simplex.length; ++i) {
    const j = i - 1;
    const xj = initialVariables[j];

    const hj = xj === 0 ? 0.00025 : 0.05;
    const xs = new Array(initialVariables.length).fill(0);
    xs[j] = hj;
    simplex[i] = _matrixAdd(initialVariables, xs);
  }

  let stableSTDSteps = 0;
  let lastSTD = -1;
  const stdTolerance = tolerance / 100;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // 1. Sort by loss/cost least to most
    const costSimplex: number[] = simplex.map(c => lossFn(c));
    costSimplex.sort((a, b) => a - b);
    simplex.sort((a, b) => lossFn(a) - lossFn(b));
    throttledCb?.([...simplex[0], costSimplex[0]]);

    // termination condition
    const std = ss.standardDeviation(costSimplex);
    if (std < tolerance) {
      break;
    }
    if (Math.abs(lastSTD - std) <= stdTolerance) {
      if (stableSTDSteps >= 2) {
        break;
      }
      stableSTDSteps++;
    } else {
      stableSTDSteps = 0;
    }
    lastSTD = std;

    // 2. Calculate centroid of the best vertices
    const xCentroid = _numpyMeanZeroAxis(simplex.slice(0, -1));

    // 3. Reflection
    const alpha = 1;
    // x_reflect = x_centroid + alpha*(x_centroid-simplex[-1])
    const xReflect = _matrixAdd(
      xCentroid,
      _matrixMultiply(alpha, _matrixSubtract(xCentroid, simplex[simplex.length - 1])),
    );
    const costReflect = lossFn(xReflect);
    if (
      costReflect < costSimplex[costSimplex.length - 2] &&
      costReflect > costSimplex[0]
    ) {
      // replace worst simplex
      simplex[simplex.length - 1] = xReflect;
    }

    // 4. Expansion
    if (costReflect < costSimplex[0]) {
      const gamma = 2;
      // x_expand = x_centroid + gamma*(x_reflect-x_centroid)
      const xExpand = _matrixAdd(
        xCentroid,
        _matrixMultiply(gamma, _matrixSubtract(xReflect, xCentroid)),
      );
      const costExpand = lossFn(xExpand);
      if (costExpand < costReflect) {
        simplex[simplex.length - 1] = xExpand;
      } else {
        simplex[simplex.length - 1] = xReflect;
      }
      continue;
    }

    // 5. Contraction
    const pho = 0.5;
    if (costReflect < costSimplex[costSimplex.length - 1]) {
      // x_contract = x_centroid + pho*(x_reflect-x_centroid)
      const xContract = _matrixAdd(
        xCentroid,
        _matrixMultiply(pho, _matrixSubtract(xReflect, xCentroid)),
      );
      const costContract = lossFn(xContract);
      if (costContract < costReflect) {
        simplex[simplex.length - 1] = xContract;
        continue;
      }
    } else {
      // x_contract = x_centroid + pho*(simplex[-1]-x_centroid)
      const xContract = _matrixAdd(
        xCentroid,
        _matrixMultiply(pho, _matrixSubtract(simplex[simplex.length - 1], xCentroid)),
      );
      const costContract = lossFn(xContract);
      if (costContract < costSimplex[costSimplex.length - 1]) {
        simplex[simplex.length - 1] = xContract;
        continue;
      }
    }

    // 6. Shrink
    const sigma = 0.5;
    for (let i = 1; i < simplex.length; ++i) {
      simplex[i] = _matrixAdd(
        simplex[0],
        _matrixMultiply(sigma, _matrixSubtract(simplex[i], simplex[0])),
      );
    }
  }

  throttledCb([...simplex[0], lossFn(simplex[0])]);
  throttledCb.flush();
  throttledCb.cancel();
  return [...simplex[0], lossFn(simplex[0])];
};
