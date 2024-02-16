import { ProgressSpinner } from "primereact/progressspinner";

import { Scatter } from "react-chartjs-2";
import { useApi } from "./client";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
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

// TODO: open in full size modal button
// TODO: different modes for class xLines (95/85/75-hhf, A-centric, 1/5/15/40/75-percentile, etc)
// TODO: maybe for HHF mode allow choosing different HHFs from another dropdown
// TODO: maybe split the modes into 2 dropdowns, one of xLines, one for yLines to play with
// TODO: maybe different options / scale depending on viewport size and desktop/tablet/mobile
export const ScoresChart = ({ division, classifier, hhf }) => {
  const data = useApi(`/classifiers/${division}/${classifier}/chart`);
  if (!data?.length) {
    return <ProgressSpinner />;
  }

  return (
    <Scatter
      options={{
        maintainAspectRatio: false,
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
};

export default ScoresChart;
