import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { annotationColor, r5annotationColor, xLine, yLine, Scatter } from "./common";
import { useApi } from "../../utils/client";
import { useState } from "react";
import { classForPercent } from "../../../../shared/utils/classification";
import { bgColorForClass } from "../../utils/color";
import { SelectButton } from "primereact/selectbutton";
import { useIsHFU } from "../../utils/useIsHFU";

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
const fieldForMode = (mode) => fieldModeMap[mode];
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

  if (loading) {
    return <ProgressSpinner />;
  }

  if (!data) {
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
                raw: { recPercent, curHHFPercent, curPercent, memberNumber, y },
              }) =>
                `${memberNumber}; ${y.toFixed(
                  2
                )}th, Rec: ${recPercent}%, curHHF: ${curHHFPercent}%, HQ: ${curPercent}%`,
            },
          },
          annotation: { annotations: lines },
        },
      }}
      data={{
        datasets: [
          {
            label: "Classification / Percentile",
            data: data?.map((c) => ({
              ...c,
              x: c[fieldForMode(xMode)],
              y: c[fieldForMode(xMode) + "Percentile"],
            })),
            pointBorderColor: "white",
            pointBorderWidth: 0,
            backgroundColor: "#ae9ef1",
            pointBackgroundColor: data?.map(
              (c) => bgColorForClass[classForPercent(c[fieldForMode(colorMode)])]
            ),
          },
        ],
      }}
    />
  );

  return (
    <div style={style}>
      {!isHFU && (
        <div className="flex mt-4 justify-content-around text-base lg:text-xl">
          <div className="flex flex-row flex-wrap justify-content-center gap-2">
            <span className="mx-4">Color:</span>
            <SelectButton
              className="compact"
              allowEmpty={false}
              options={modes}
              value={colorMode}
              onChange={(e) => setColorMode(e.value)}
            />
          </div>
          <div className="flex flex-row flex-wrap justify-content-center gap-2">
            <span className="mx-4">Position:</span>
            <SelectButton
              className="compact"
              allowEmpty={false}
              options={modes}
              value={xMode}
              onChange={(e) => setXMode(e.value)}
            />
          </div>
        </div>
      )}
      <div style={{ maxWidth: "100%", height: "calc(100vh - 420px)", minHeight: 360 }}>
        {graph}
      </div>
    </div>
  );
};

export default ShootersDistributionChart;
