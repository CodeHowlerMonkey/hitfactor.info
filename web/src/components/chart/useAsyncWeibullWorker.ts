import { solveWeibull } from "../../../../shared/utils/weibull";

self.onmessage = e => {
  const { dataPoints } = e.data || {};
  const weibull = solveWeibull(dataPoints, partialResult =>
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
