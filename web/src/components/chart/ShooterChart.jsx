import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { Line } from "./common";
import { useApi } from "../../utils/client";
import { useState } from "react";
import { sportForDivision } from "../../../../shared/constants/divisions";

const annotationColor = (alpha) => `rgba(255, 99, 132, ${alpha})`;
const yLine = (name, y, alpha) => ({
  [name]: {
    type: "line",
    yMin: y,
    yMax: y,
    borderColor: annotationColor(alpha * 0.5),
    borderWidth: 1,
  },
  [name + "Label"]: {
    type: "label",
    xValue: "auto",
    yValue: y,
    color: annotationColor(alpha),
    position: { x: "center", y: "center" },
    content: [y + "%"],
    font: {
      size: 8,
    },
  },
});

export const ScoresChart = ({ division, memberNumber }) => {
  const isHFU = sportForDivision(division) === "hfu";
  const [full, setFull] = useState(false);
  const [percentMode, setPercentMode] = useState(false);
  const { json: data, loading } = useApi(
    `/shooters/${division}/${memberNumber}/chart?y=${
      percentMode ? "percent" : "curPercent"
    }`
  );
  if (loading) {
    return <ProgressSpinner />;
  }

  if (!data) {
    return null;
  }

  const graph = (
    <Line
      style={{ width: "100%", height: "100%", position: "relative" }}
      adapters={null}
      options={{
        responsive: true,
        // wanted false for rezize but annotations are bugged and draw HHF/GM lines wrong
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "time",
            min: "auto",
            time: {
              parser: "MM/dd/yy",
              unit: "month",
            },
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
          tooltip: {
            callbacks: {
              label: ({ raw: { y, classifier } }) => classifier + ": " + y + "%",
              title: ([
                {
                  raw: { x, y },
                },
              ]) => x,
            },
          },
          annotation: {
            annotations: {
              ...yLine("HHF", 100, 1),
              ...yLine("GM", 95, 0.7),
              ...yLine("M", 85, 0.5),
              ...yLine("A", 75, 0.4),
              ...yLine("B", 60, 0.3),
              ...yLine("C", 40, 0.2),
            },
          },
        },
      }}
      data={{
        datasets: [
          !isHFU && {
            label: "Percent",
            data: data.map((c) => ({
              ...c,
              x: new Date(new Date(c.x).toLocaleDateString("en-us", { timeZone: "UTC" })),
              y: c.percent,
            })),
            backgroundColor: "#ae9ef1",
            borderColor: "#ca258a",
          },
          !isHFU && {
            label: "Current Percent",
            data: data.map((c) => ({
              ...c,
              x: new Date(new Date(c.x).toLocaleDateString("en-us", { timeZone: "UTC" })),
              y: c.curPercent,
            })),
            backgroundColor: "#b5ca25",
          },
          {
            label: isHFU ? "Percent" : "Rec. Percent",
            data: data.map((c) => ({
              ...c,
              x: new Date(new Date(c.x).toLocaleDateString("en-us", { timeZone: "UTC" })),
              y: c.recPercent,
            })),
            borderColor: isHFU ? "#ca258a" : "#40cf40",
            backgroundColor: isHFU ? "#ae9ef1" : "#05ca25",
          },
        ].filter(Boolean),
      }}
    />
  );

  if (full) {
    return (
      <Dialog
        header="Scores Distribution"
        visible
        style={{ width: "96vw", height: "96vh", margin: "16px" }}
        onHide={() => setFull(false)}
      >
        {graph}
      </Dialog>
    );
  }

  return (
    <>
      {graph}
      <Button
        onClick={() => setFull(true)}
        rounded
        text
        icon="pi pi-arrows-alt"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          transform: "rotate(45deg)",
        }}
      />
    </>
  );
};

export default ScoresChart;
