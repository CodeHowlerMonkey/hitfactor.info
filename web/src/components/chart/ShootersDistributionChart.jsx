import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useMemo, useState } from "react";

import { classForPercent } from "../../../../shared/utils/classification";
import {
  skewness,
  kurtosis,
  solveWeibull,
  weibulCDFFactory,
} from "../../../../shared/utils/weibull";
import { useApi } from "../../utils/client";
import { bgColorForClass } from "../../utils/color";
import { useIsHFU } from "../../utils/useIsHFU";

import {
  annotationColor,
  r5annotationColor,
  xLine,
  yLine,
  Scatter,
  wbl1AnnotationColor,
  pointsGraph,
} from "./common";
import { useAsyncWeibull } from "./useAsyncWeibull";

const lines = {
  ...yLine("1th", 1.0, annotationColor(0.7)),
  ...yLine("4.5th", 4.5, annotationColor(0.5)),
  ...yLine("15th", 14.5, annotationColor(0.4)),
  ...yLine("45th", 45, annotationColor(0.3)),
  ...yLine("85th", 85, annotationColor(0.2)),
  ...xLine("95%", 95, r5annotationColor(0.5), 2.5),
  ...xLine("85%", 85, r5annotationColor(0.5), 2.5),
  ...xLine("75%", 75, r5annotationColor(0.5), 2.5),
  ...xLine("60%", 60, r5annotationColor(0.5), 2.5),
  ...xLine("40%", 40, r5annotationColor(0.5), 2.5),
};

const fieldModeMap = {
  HQ: "curPercent",
  "Cur.HHF": "curHHFPercent",
  "Rec.": "recPercent",
};
const fieldForMode = mode => fieldModeMap[mode];
const modes = Object.keys(fieldModeMap);
const recommendedMode = modes[2];

export const ShootersDistributionChart = ({ division, style }) => {
  const isHFU = useIsHFU(division);
  const [colorModeState, setColorMode] = useState(recommendedMode);
  const [xModeState, setXMode] = useState(recommendedMode);

  // only use recommended in HFU
  const colorMode = isHFU ? recommendedMode : colorModeState;
  const xMode = isHFU ? recommendedMode : xModeState;

  const { json: data, loading } = useApi(`/shooters/${division}/chart`);

  const curModeData = useMemo(
    () =>
      data?.map(c => ({
        ...c,
        x: c[fieldForMode(xMode)],
        y: c[`${fieldForMode(xMode)}Percentile`],
      })) || [],
    [data, xMode],
  );

  const curModeDataPoints = useMemo(() => curModeData.map(c => c.x), [curModeData]);

  const {
    k,
    lambda,
    kurtosis: curModeKurtosis,
    skewness: curModeSkewness,
    loading: loadingWeibull,
  } = useAsyncWeibull(curModeDataPoints);

  if (loading) {
    return <ProgressSpinner />;
  }

  if (!curModeData.length) {
    return null;
  }

  const graph = (
    <Scatter
      options={{
        maintainAspectRatio: false,
        scales: { y: { reverse: true } },
        elements: {
          point: {
            radius: 3,
          },
        },
        plugins: {
          zoom: {
            pan: { enabled: true },
            zoom: {
              mode: "xy",
              enabled: true,
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: ({
                raw: {
                  recPercent,
                  curHHFPercent,
                  curPercent,
                  memberNumber,
                  y,
                  pointsGraphName,
                },
              }) => {
                if (pointsGraphName) {
                  return null;
                }
                return `${memberNumber}; ${y.toFixed(
                  2,
                )}th, Rec: ${recPercent}%, curHHF: ${curHHFPercent}%, HQ: ${curPercent}%`;
              },
            },
          },
          annotation: { annotations: lines },
        },
      }}
      data={{
        datasets: [
          {
            label: "Weibull",
            data: pointsGraph({
              yFn: weibulCDFFactory(k, lambda),
              minX: 0,
              maxX: 100,
              step: 0.1,
              name: "Weibull",
            }),
            pointRadius: 1,
            pointBorderColor: "black",
            pointBorderWidth: 0,
            pointBackgroundColor: wbl1AnnotationColor(0.66),
          },
          {
            label: "Classification / Percentile",
            data: curModeData,
            pointBorderColor: "white",
            pointBorderWidth: 0,
            backgroundColor: "#ae9ef1",
            pointBackgroundColor: data?.map(
              c => bgColorForClass[classForPercent(c[fieldForMode(colorMode)])],
            ),
          },
        ],
      }}
    />
  );

  return (
    <div style={style}>
      <div className="flex mt-4 justify-content-around text-base lg:text-xl">
        {!isHFU && (
          <>
            <div className="flex flex-column justify-content-center align-items-start">
              <span className="text-md text-500 font-bold">Color</span>
              <SelectButton
                className="compact text-xs"
                allowEmpty={false}
                options={modes}
                value={colorMode}
                onChange={e => setColorMode(e.value)}
              />
            </div>
            <div className="flex flex-column justify-content-center align-items-start">
              <span className="text-md text-500 font-bold">Position</span>
              <SelectButton
                className="compact text-xs"
                allowEmpty={false}
                options={modes}
                value={xMode}
                onChange={e => setXMode(e.value)}
              />
            </div>
          </>
        )}
        <div className="flex flex-column justify-content-center align-items-start">
          <div className="flex flex-column justify-content-center text-md text-500 font-bold">
            {loadingWeibull ? (
              <div className="flex gap-2 align-items-center">
                <ProgressSpinner
                  strokeWidth={4}
                  style={{ width: "1.5em", height: "1.5em" }}
                />
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
              <div>Skewness = {curModeSkewness.toFixed(6)}</div>
              <div>Kurtosis = {curModeKurtosis.toFixed(6)}</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: "100%", height: "calc(100vh - 420px)", minHeight: 360 }}>
        {graph}
      </div>
    </div>
  );
};

export default ShootersDistributionChart;
