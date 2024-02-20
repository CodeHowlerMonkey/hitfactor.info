import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { Scatter } from "react-chartjs-2";
import { useApi } from "./client";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { useState } from "react";
Chart.register(...registerables);
Chart.register(annotationPlugin);

//              [{ x: -10, y: 0 }],
// 1 5 15 40 75

const annotationColor = (alpha) => `rgba(255, 99, 132, ${alpha})`;
const yLine = (name, y, alpha) => ({
  [name]: {
    type: "line",
    yMin: y,
    yMax: y,
    borderColor: annotationColor(alpha),
    borderWidth: 1,
  },
  [name + "Label"]: {
    type: "label",
    xValue: 0,
    yValue: y,
    color: annotationColor(alpha),
    position: "start",
    content: [y + "th"],
    font: {
      size: 12,
    },
  },
});
const xLine = (name, x, alpha) => ({
  [name]: {
    type: "line",
    xMin: x,
    xMax: x,
    borderColor: annotationColor(alpha),
    borderWidth: 1,
  },
  [name + "Label"]: {
    type: "label",
    xValue: x,
    yValue: 90,
    color: annotationColor(alpha),
    position: "start",
    content: [name],
    font: {
      size: 12,
    },
  },
});
const point = (name, x, y, alpha) => ({
  [name]: {
    type: "point",
    xValue: x,
    yValue: y,
    radius: 3,
    borderWidth: 0,
    backgroundColor: annotationColor(alpha),
  },
});

// TODO: different modes for class xLines (95/85/75-hhf, A-centric, 1/5/15/40/75-percentile, etc)
// TODO: maybe for HHF mode allow choosing different HHFs from another dropdown
// TODO: maybe split the modes into 2 dropdowns, one of xLines, one for yLines to play with
// TODO: maybe different options / scale depending on viewport size and desktop/tablet/mobile
// TODO: all vs current search mode
export const ScoresChart = ({ division, classifier, hhf }) => {
  const [full, setFull] = useState(false);
  const data = useApi(
    `/classifiers/${division}/${classifier}/chart?full=${full ? 1 : 0}`
  );
  if (!data?.length) {
    return <ProgressSpinner />;
  }

  const graph = (
    <Scatter
      style={{ position: "relative" }}
      options={{
        // wanted false for rezize but annotations are bugged and draw HHF/GM lines wrong
        maintainAspectRatio: !full,
        scales: { y: { reverse: true } },
        elements: {
          point: {
            radius: 2,
          },
        },
        plugins: {
          annotation: {
            annotations: {
              ...yLine("1th", 1, 0.7),
              ...yLine("5th", 5, 0.5),
              ...yLine("15th", 15, 0.4),
              ...yLine("40th", 40, 0.3),
              ...yLine("75th", 75, 0.2),
              ...xLine("HHF", hhf, 1),
              ...xLine("GM", 0.95 * hhf, 0.7),
              ...xLine("M", 0.85 * hhf, 0.5),
              ...xLine("A", 0.75 * hhf, 0.4),
              ...xLine("B", 0.6 * hhf, 0.3),
              ...xLine("C", 0.4 * hhf, 0.2),
              ...point("GM/1", 0.95 * hhf, 1, 0.7),
              ...point("M/5", 0.85 * hhf, 5, 0.5),
              ...point("A/15", 0.75 * hhf, 15, 0.4),
              ...point("B/40", 0.6 * hhf, 40, 0.3),
              ...point("C/75", 0.4 * hhf, 75, 0.2),
            },
          },
        },
      }}
      data={{
        datasets: [
          {
            label: "HF / Percentile",
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
