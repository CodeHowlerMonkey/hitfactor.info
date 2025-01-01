import { solveWeibull } from "../../../../shared/utils/weibull";

self.onmessage = e => {
  const { dataPoints, precision } = e.data || {};
  const weibull = solveWeibull(dataPoints, precision, partialResult =>
    self.postMessage({
      ...partialResult,
      loading: true,
    }),
  );

  self.postMessage({
    ...weibull,
    loading: false,
  });
};
