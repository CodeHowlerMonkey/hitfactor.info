import { kurtosis, skewness, solveWeibull } from "../../../../shared/utils/weibull";

self.onmessage = e => {
  const { dataPoints, precision } = e.data || {};
  const skew = skewness(dataPoints);
  const kurt = kurtosis(dataPoints);
  const weibull = solveWeibull(dataPoints, precision, partialResult =>
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
