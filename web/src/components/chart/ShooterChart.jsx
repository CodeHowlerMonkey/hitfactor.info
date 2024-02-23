import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { Line } from "./common";
import { useApi } from "../../utils/client";
import { useState } from "react";

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

// TODO: curPercent vs percent modes
export const ScoresChart = ({ division, memberNumber }) => {
  const [full, setFull] = useState(false);
  const [percentMode, setPercentMode] = useState(false);
  const data = useApi(
    `/shooters/${division}/${memberNumber}/chart?y=${
      percentMode ? "percent" : "curPercent"
    }`
  );
  if (!data?.length) {
    return <ProgressSpinner />;
  }

  const graph = (
    <Line
      style={{ position: "relative" }}
      adapters={null}
      options={{
        // wanted false for rezize but annotations are bugged and draw HHF/GM lines wrong
        maintainAspectRatio: !full,
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
              label: ({ raw: { y, classifier } }) =>
                classifier + ": " + y + "%",
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
          {
            label: "Percent / Date",
            data,
            backgroundColor: "#ae9ef1",
          },
        ],
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
