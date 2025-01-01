import { ProgressSpinner } from "primereact/progressspinner";

import { AsyncWeibullResult } from "./useAsyncWeibull";

interface WeibullStatusProps {
  weibull: AsyncWeibullResult;
}

// TODO: Mean Absolute Error, Mean Squared Error, Max Error
// and their quantile counterparts  MAQE, QMSE, Max Quantile Error
export const WeibullStatus = ({
  weibull: {
    loading,
    k,
    lambda,
    skewness,
    kurtosis,
    meanSquaredError,
    meanAbsoluteError,
    maxError,
  },
}: WeibullStatusProps) => (
  <div className="flex flex-column justify-content-center align-items-start">
    <div className="flex flex-column justify-content-center text-md text-500 font-bold">
      {loading ? (
        <div className="flex gap-2 align-items-center">
          <ProgressSpinner strokeWidth="4" style={{ width: "1.5em", height: "1.5em" }} />
          Calculating...
        </div>
      ) : (
        "Weibull Ready"
      )}
    </div>
    <div className="flex gap-4 text-sm">
      <div className="flex flex-column justify-content-center text-md text-500 font-bold">
        <div>k = {k.toFixed(6)}</div>
        <div>𝛌 = {lambda.toFixed(6)}</div>
      </div>
      <div className="flex flex-column justify-content-center text-md text-500 font-bold">
        <div>Skewness = {skewness.toFixed(6)}</div>
        <div>Kurtosis = {kurtosis.toFixed(6)}</div>
      </div>
      <div className="flex flex-column justify-content-center text-md text-500 font-bold">
        <div>MSE = {meanSquaredError.toFixed(6)}</div>
        <div>MAE = {meanAbsoluteError.toFixed(6)}</div>
        <div>ME = {maxError.toFixed(6)}</div>
      </div>
    </div>
  </div>
);
