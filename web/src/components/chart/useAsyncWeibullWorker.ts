import {
  DEFAULT_PRECISION,
  kurtosis,
  skewness,
  solveWeibull,
} from "../../../../shared/utils/weibull";

self.onmessage = e => {
  const dataPoints = e.data as number[];
  const skew = skewness(dataPoints);
  const kurt = kurtosis(dataPoints);
  const weibull = solveWeibull(dataPoints, DEFAULT_PRECISION, partialResult =>
    self.postMessage({
      ...partialResult,
      skewness: skew,
      kurtosis: kurt,
      loading: true,
    }),
  );

  self.postMessage({
    ...weibull,
    skewness: skew,
    kurtosis: kurt,
    loading: false,
  });
};
