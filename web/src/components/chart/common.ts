export { Scatter, Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";

import { fuzzyEqual } from "../../../../shared/utils/hitfactor";

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
  [`${name}Label`]: {
    type: "label",
    xValue: 0,
    yValue: y - 0.5,
    color,
    position: "start",
    content: [name],
    font: {
      size: 11,
    },
  },
});

export const xLine = (name, x, color, extraLabelOffset = 0, lowY = false) => ({
  [name]: {
    type: "line",
    xMin: x,
    xMax: x,
    borderColor: color,
    borderWidth: 1,
  },
  [`${name}Label`]: {
    type: "label",
    xValue: x,
    yValue: lowY ? 15 + 2 * extraLabelOffset : 95 - 2 * extraLabelOffset,
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
    radius: 2,
    borderWidth: 0,
    backgroundColor: color,
  },
});

export interface GraphPoint {
  x: number;
  y: number;
}

export const closestYForX = (targetX: number, dataRaw: GraphPoint[]): number => {
  if (!dataRaw?.length) {
    return -1;
  }

  const perfect = dataRaw.find(c => fuzzyEqual(targetX, c.x, 0.001));
  if (perfect) {
    return perfect.y;
  }

  const data = dataRaw.toSorted((a, b) => a.x - b.x);
  let lowIndex = data.findLastIndex(c => c.x < targetX);
  let highIndex = data.findIndex(c => c.x > targetX);
  let indexOffset = 0;

  if (highIndex < 0) {
    highIndex = lowIndex;
    lowIndex = lowIndex - 1;
    indexOffset = 1;
  }

  if (lowIndex < 0) {
    return -1;
  }

  const lowPoint = data[lowIndex];
  const highPoint = data[highIndex];
  const startPoint = data[lowIndex + indexOffset];

  if (highPoint.x === lowPoint.x) {
    return lowPoint.y;
  }

  const k = (highPoint.y - lowPoint.y) / (highPoint.x - lowPoint.x);
  const result = startPoint.y + k * (targetX - startPoint.x);
  return result;
};

/** Generates a dataset of points, with X within [minX, maxX] and y
 * determined by the yFn(x).
 */
export const pointsGraph = ({ yFn, minX, maxX, name, step: stepParam }) => {
  if (!yFn || minX === maxX) {
    return [];
  }

  const step = stepParam || 0.005;
  const totalPoints = Math.ceil((maxX - minX) / step);

  const result = Array.from({ length: totalPoints }, (v, i) => {
    const x = minX + (i + 1) * step;
    return {
      y: yFn(x),
      x: x,
      pointsGraphName: name,
    };
  });

  return result;
};

export const annotationColor = alpha => `rgba(255, 99, 132, ${alpha * 0.5})`;
export const r1annotationColor = alpha => `rgba(132, 99, 255, ${alpha * 0.75})`;
export const r5annotationColor = alpha => `rgba(99, 255, 132, ${alpha})`;
export const r15annotationColor = alpha => `rgba(255, 255, 132, ${alpha})`;
export const wbl1AnnotationColor = alpha =>
  `#5d4bdd${Math.round(alpha * 255).toString(16)}`;
export const wbl5AnnotationColor = alpha =>
  `#804bdd${Math.round(alpha * 255).toString(16)}`;
export const wbl15AnnotationColor = alpha =>
  `#a44bdd${Math.round(alpha * 255).toString(16)}`;
