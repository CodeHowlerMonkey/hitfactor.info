export { Scatter, Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
Chart.register(...registerables);
Chart.register(annotationPlugin);
Chart.register(zoomPlugin);

export const yLine = (name, y, color) => ({
  [name]: {
    type: "line",
    yMin: y,
    yMax: y,
    borderColor: color,
    borderWidth: 1,
  },
  [name + "Label"]: {
    type: "label",
    xValue: 0,
    yValue: y - 1.1,
    color,
    position: "start",
    content: [y + "th"],
    font: {
      size: 11,
    },
  },
});

export const xLine = (name, x, color, extraLabelOffset = 0) => ({
  [name]: {
    type: "line",
    xMin: x,
    xMax: x,
    borderColor: color,
    borderWidth: 1,
  },
  [name + "Label"]: {
    type: "label",
    xValue: x,
    yValue: 95 - 2 * extraLabelOffset,
    color,
    position: "start",
    content: [name],
    font: {
      size: 12,
    },
  },
});

export const point = (name, x, y, color) => ({
  [name]: {
    type: "point",
    xValue: x,
    yValue: y,
    radius: 3,
    borderWidth: 0,
    backgroundColor: color,
  },
});

export const annotationColor = (alpha) => `rgba(255, 99, 132, ${alpha * 0.5})`;
export const r1annotationColor = (alpha) =>
  `rgba(132, 99, 255, ${alpha * 0.75})`;
export const r5annotationColor = (alpha) => `rgba(99, 255, 132, ${alpha})`;
export const r15annotationColor = (alpha) => `rgba(255, 255, 132, ${alpha})`;
