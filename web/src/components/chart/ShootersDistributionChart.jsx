import { Dropdown } from "primereact/dropdown";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useMemo, useState } from "react";

import { classForPercent } from "@shared/classification/brackets";
import { weibulCDFFactory } from "@shared/utils/weibull";

import {
  annotationColor,
  r5annotationColor,
  xLine,
  yLine,
  Scatter,
  wbl1AnnotationColor,
  pointsGraph,
  closestYForX,
  wbl1COAnnotationColor,
} from "./common";
import { ageModes, modes, fieldForMode, ageModeParam } from "./fields";
import { useAsyncWeibull } from "./useAsyncWeibull";
import { WeibullStatus } from "./WeibullStatus";

import { useApi } from "../../utils/client";
import { bgColorForClass } from "../../utils/color";

const recommendedMode = modes[0];

export const ShootersDistributionChart = ({ division, style }) => {
  const [colorModeState, setColorMode] = useState(recommendedMode);
  const [xModeState, setXMode] = useState(recommendedMode);
  const [ageMode, setAgeMode] = useState(ageModes[0]);

  const colorMode = colorModeState;
  const xMode = xModeState;

  const { json: data, loading } = useApi(
    `/shooters/${division}/chart?xMode=${fieldForMode(xMode)}&colorMode=${fieldForMode(colorMode)}${ageModeParam(ageMode)}`,
  );

  const curModeData = useMemo(() => data || [], [data]);

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
        onClick: (_e, elements) => {
          const valid = elements?.find(e => !!e?.element?.$context?.raw?.memberNumber);
          const memberNumber = valid?.element?.$context?.raw?.memberNumber;
          if (!memberNumber) {
            return;
          }

          window.open(`/shooters/${division}/${memberNumber}`, "_blank");
        },
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
                  recPercentUncapped,
                  memberNumber,
                  y,
                  pointsGraphName,
                  recPercentUncappedHigh,
                },
              }) => {
                if (pointsGraphName) {
                  return null;
                }
                return `${memberNumber}; Top ${y.toFixed(
                  2,
                )}%, Rec.: ${recPercentUncapped}%, Rec. High: ${recPercentUncappedHigh}%`;
              },
            },
          },
          annotation: {
            annotations: {
              ...Object.assign(
                {},
                ...percentiles.map((perc, i) =>
                  yLine(
                    `Top ${perc[0]?.toFixed(2)}% (${perc[1]}) = ${["GM", "M", "A", "B", "C"][i]}`,
                    perc[0],
                    annotationColor(0.75),
                  ),
                ),
                yLine(
                  `Total ${curModeDataPoints.length}`,
                  100,
                  annotationColor(0.75),
                  110,
                  true,
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
            label: "Weibull CO '25",
            data: pointsGraph({
              yFn: weibulCDFFactory(3.9185, 61.7583),
              minX: 0,
              maxX: curModeDataPoints[0],
              step: 0.1,
              name: "Weibull",
            }),
            pointRadius: 1,
            pointBorderColor: "black",
            pointBorderWidth: 0,
            pointBackgroundColor: wbl1COAnnotationColor(0.66),
          },
          {
            label: "Weibull",
            data: pointsGraph({
              yFn: weibulCDFFactory(k, lambda),
              minX: 0,
              maxX: curModeDataPoints[0],
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
            pointBackgroundColor: curModeData?.map(
              c => bgColorForClass[classForPercent(c[fieldForMode(colorMode)])],
            ),
          },
        ],
      }}
    />
  );

  return (
    <div style={style}>
      <div className="flex mt-4 justify-content-around gap-4 mb-2 text-base lg:text-xl flex-wrap">
        <div className="flex flex-row gap-2">
          <div className="flex flex-column justify-content-center align-items-start gap-1">
            <span className="text-md text-500 font-bold">Color</span>
            <Dropdown
              className="compact text-xs"
              options={modes}
              value={colorMode}
              onChange={e => setColorMode(e.value)}
            />
          </div>
          <div className="flex flex-column justify-content-center align-items-start gap-1">
            <span className="text-md text-500 font-bold">Position</span>
            <Dropdown
              className="compact text-xs"
              options={modes}
              value={xMode}
              onChange={e => setXMode(e.value)}
            />
          </div>
          <div className="flex flex-column justify-content-start align-items-start ml-4 mr-8 gap-1">
            <span className="text-md text-500 font-bold">Age</span>
            <SelectButton
              className="compact text-xs flex flex-nowrap white-space-nowrap"
              allowEmpty={false}
              options={ageModes}
              value={ageMode}
              onChange={e => setAgeMode(e.value)}
            />
          </div>
        </div>
        <WeibullStatus weibull={weibull} />
      </div>
      <div
        style={{
          maxWidth: "100%",
          height: "calc(min(80vh, max(60vh, 60vw)))",
        }}
      >
        {graph}
      </div>
    </div>
  );
};

export default ShootersDistributionChart;
