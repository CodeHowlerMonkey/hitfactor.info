import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useState } from "react";

import { sportForDivision } from "../../../../shared/constants/divisions";
import { keepPreviousData, useApi } from "../../utils/client";

import { Line } from "./common";

const modesMap = {
  "Cur. HHF": "curPercent",
  Recommended: "brutal",
};
const modeBucketForMode = mode => modesMap[mode];
const modes = Object.keys(modesMap);

export const ShooterProgressChart = ({ division, memberNumber }) => {
  const isHFU = sportForDivision(division) === "hfu";
  const [mode, setMode] = useState(modes[2]);
  const { json: data, loading } = useApi(
    `/shooters/${division}/${memberNumber}/chart/progress/${modeBucketForMode(mode)}`,
    { placeholderData: keepPreviousData },
  );
  if (loading && !data) {
    return <ProgressSpinner />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="relative bg-primary-reverse flex-grow-1">
      <Line
        style={{ width: "100%", height: "100%", position: "relative" }}
        adapters={null}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              max: 100,
              min: 40,
            },
            x: {
              type: "time",
              min: "auto",
            },
          },
          elements: {
            line: {
              fill: "blue",
              color: "blue",
              borderColor: "pink",
              borderWidth: 1,
            },
            point: {
              label: "kek",
              radius: 2,
            },
          },
          plugins: {
            zoom: {
              pan: { enabled: true },
              zoom: {
                mode: "xy",
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
                label: ({ raw: { y } }) => `${y}%`,
                title: ([
                  {
                    raw: { x },
                  },
                ]) => x.toLocaleDateString(),
              },
            },
          },
        }}
        data={{
          datasets: [
            {
              label: "Percent",
              data: data.map(c => ({
                x: new Date(
                  new Date(c.sd).toLocaleDateString("en-us", { timeZone: "UTC" }),
                ),
                y: c.p,
              })),
              backgroundColor: "#ae9ef1",
              borderColor: "#ca258a",
            },
          ],
        }}
      />
      {loading && (
        <ProgressSpinner
          style={{
            position: "absolute",
            margin: "auto",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />
      )}
      {!isHFU && (
        <div className="flex justify-space-around absolute right-0 left-0 top-0">
          <SelectButton
            className="compact"
            allowEmpty={false}
            options={modes}
            value={mode}
            onChange={e => setMode(e.value)}
            size={10}
            style={{ margin: "auto", transform: "scale(0.65)" }}
          />
        </div>
      )}
    </div>
  );
};

export default ShooterProgressChart;
