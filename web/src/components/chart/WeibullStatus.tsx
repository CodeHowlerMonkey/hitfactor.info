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
    superMeanSquaredError,
    superMeanAbsoluteError,
    maxError,
  },
}: WeibullStatusProps) => (
  <div className="flex flex-column justify-content-center align-items-start">
    <div
      style={{ whiteSpace: "pre" }}
      className="flex flex-column justify-content-center text-md text-500 font-bold w-full justify-content-center text-center"
    >
      {loading ? (
        <div className="flex gap-2 align-items-center justify-content-center">
          <ProgressSpinner
            strokeWidth="4"
            style={{ width: "1.5em", height: "1.5em", margin: 0 }}
          />
          Calculating...
        </div>
      ) : (
        `Weibull Ready`
      )}
    </div>
    <div className="flex gap-4 text-sm align-items-start">
      <div className="flex flex-column justify-content-center text-md text-500 font-bold">
        <div>k = {k.toFixed(4)}</div>
        <div>𝛌 = {lambda.toFixed(4)}</div>
        <div>Skewness = {skewness.toFixed(4)}</div>
        <div>Kurtosis = {kurtosis.toFixed(4)}</div>
      </div>
      <div className="flex flex-column justify-content-center text-md text-500 font-bold">
        <div>SMSE = {superMeanSquaredError.toFixed(4)}</div>
        <div>SMAE = {superMeanAbsoluteError.toFixed(4)}</div>
        <div>MSE = {meanSquaredError.toFixed(4)}</div>
        <div>MAE = {meanAbsoluteError.toFixed(4)}</div>
        <div>ME = {maxError.toFixed(4)}</div>
      </div>
    </div>
  </div>
);
