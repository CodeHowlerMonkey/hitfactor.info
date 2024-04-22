import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { annotationColor, r5annotationColor, xLine, yLine, Scatter } from "./common";
import { useApi } from "../../utils/client";
import { useState } from "react";
import { classForPercent } from "../../../../shared/utils/classification";
import { bgColorForClass } from "../../utils/color";
import { SelectButton } from "primereact/selectbutton";

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

const modes = ["HQ", "Cur. HHF", "Recommended", "Brutal"];
const fieldForMode = (mode) =>
  ({
    HQ: "curPercent",
    "Cur. HHF": "curHHFPercent",
    Recommended: "recPercent",
    Brutal: "brutalPercent",
  }[mode]);

export const ShootersDistributionChart = ({ division, style }) => {
  const [colorMode, setColorMode] = useState(modes[2]);
  const [xMode, setXMode] = useState(modes[2]);
  const { json: data, loading } = useApi(`/shooters/${division}/chart`);

  if (loading) {
    return <ProgressSpinner />;
  }

  if (!data) {
    return null;
  }

  const graph = (
    <Scatter
      style={{ position: "relative", width: "100%", height: "100%" }}
      options={{
        maintainAspectRatio: true,
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
      <div className="flex align-items-center mt-4 justify-content-between">
        <div
          className="flex flex-row align-items-center"
          style={{ transform: "scale(0.65)" }}
        >
          <span className="text-xl mx-4">Color:</span>
          <SelectButton
            allowEmpty={false}
            options={modes}
            value={colorMode}
            onChange={(e) => setColorMode(e.value)}
            style={{ transforms: "scale(0.65)" }}
          />
        </div>
        <div className="flex-grow-1" />
        <div
          className="flex flex-row align-items-center"
          style={{ transform: "scale(0.65)" }}
        >
          <span className="text-xl mx-4">Position:</span>
          <SelectButton
            allowEmpty={false}
            options={modes}
            value={xMode}
            onChange={(e) => setXMode(e.value)}
            style={{ transforms: "scale(0.65)" }}
          />
        </div>
      </div>
      {graph}
    </div>
  );
};

export default ShootersDistributionChart;
