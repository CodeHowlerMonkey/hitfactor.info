import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useMemo, useState } from "react";

import { classForPercent } from "../../../../shared/utils/classification";
import { weibulCDFFactory } from "../../../../shared/utils/weibull";
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
  closestYForX,
} from "./common";
import { useAsyncWeibull } from "./useAsyncWeibull";
import { WeibullStatus } from "./WeibullStatus";

const fieldModeMap = {
  HQ: "curPercent",
  "Cur.HHF": "curHHFPercent",
  "Rec.HHFOnly": "recHHFOnlyPercent",
  "Rec.Soft": "recSoftPercent",
  "Rec.Brutal": "recPercent",
  "Rec.Brutal Uncapped": "recPercentUncapped",
};
const fieldForMode = mode => fieldModeMap[mode];
const modes = Object.keys(fieldModeMap);
const recommendedMode = modes[4];

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
      data
        ?.map(c => ({
          ...c,
          x: c[fieldForMode(xMode)],
          y: c[`${fieldForMode(xMode)}Percentile`],
        }))
        ?.filter(c => c.y > 0 && c.x > 0) || [],
    [data, xMode],
  );

  const percentiles = useMemo(
    () => [
      closestYForX(95, curModeData),
      closestYForX(85, curModeData),
      closestYForX(75, curModeData),
      closestYForX(60, curModeData),
      closestYForX(40, curModeData),
    ],
    [curModeData],
  );

  const curModeDataPoints = useMemo(() => curModeData.map(c => c.x), [curModeData]);

  const weibull = useAsyncWeibull(curModeDataPoints);
  const { k, lambda } = weibull;

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
                return `${memberNumber}; Top ${y.toFixed(
                  2,
                )}%, Rec: ${recPercent}%, HQ/curHHF: ${curHHFPercent}%`;
              },
            },
          },
          annotation: {
            annotations: {
              // TODO: [local experiment only] uncap hundo and reclassify all CO
              // shooters to see how it affects percentiles.
              //
              // Intuition: currently M is around target, A,B,C are easier than 85th/60th/20th
              // and GM is harder than 99th, possibly due to "compression" of GM classifier
              // scores on the upper end. By removing the hundo-cap we should increase classification of
              // people, who have >100% runs, which should be relatively small, but increases number of GMs
              ...Object.assign(
                {},
                ...percentiles.map((perc, i) =>
                  yLine(
                    `Top ${perc?.toFixed(2)}% = ${["GM", "M", "A", "B", "C"][i]}`,
                    perc,
                    annotationColor(0.75),
                  ),
                ),
              ),
              ...xLine("95%", 95, r5annotationColor(0.5), 2.5),
              ...xLine("85%", 85, r5annotationColor(0.5), 2.5),
              ...xLine("75%", 75, r5annotationColor(0.5), 2.5),
              ...xLine("60%", 60, r5annotationColor(0.5), 2.5),
              ...xLine("40%", 40, r5annotationColor(0.5), 2.5),
            },
          },
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
      <div className="flex mt-4 justify-content-start gap-4 mb-2 text-base lg:text-xl">
        {!isHFU && (
          <div className="flex flex-column gap-2">
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
          </div>
        )}
        <WeibullStatus weibull={weibull} />
      </div>
      <div
        style={{
          maxWidth: "100%",
          height: "calc(100vh - 420px)",
          minHeight: "calc(max(60vh, 60vw))",
        }}
      >
        {graph}
      </div>
    </div>
  );
};

export default ShootersDistributionChart;
