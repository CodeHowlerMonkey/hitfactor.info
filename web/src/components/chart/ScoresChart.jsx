import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { Scatter } from "./common";
import { useApi } from "../../utils/client";
import { useState } from "react";
import { classForPercent } from "../../../../shared/utils/classification";
import { bgColorForClass } from "../../utils/color";

const yLine = (name, y, color) => ({
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
    yValue: y,
    color,
    position: "start",
    content: [y + "th"],
    font: {
      size: 12,
    },
  },
});
const xLine = (name, x, color, extraLabelOffset = 0) => ({
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
    yValue: 100 - x * 8 + extraLabelOffset,
    color,
    position: "start",
    content: [name],
    font: {
      size: 12,
    },
  },
});
const point = (name, x, y, color) => ({
  [name]: {
    type: "point",
    xValue: x,
    yValue: y,
    radius: 3,
    borderWidth: 0,
    backgroundColor: color,
  },
});

const annotationColor = (alpha) => `rgba(255, 99, 132, ${alpha * 0.5})`;
const r1annotationColor = (alpha) => `rgba(132, 99, 255, ${alpha * 0.75})`;
const r5annotationColor = (alpha) => `rgba(99, 255, 132, ${alpha})`;
const r15annotationColor = (alpha) => `rgba(255, 255, 132, ${alpha})`;
const colorForPrefix = (prefix, alpha) =>
  ({
    "": annotationColor,
    r1: r1annotationColor,
    r5: r5annotationColor,
    r15: r15annotationColor,
  }[prefix](alpha));
const extraLabelOffsets = {
  "": 0,
  r1: 5,
  r5: 15,
  r15: 25,
};

// TODO: #23 Fix Negative Recommended HHFs Properly, so we don't need  hhf <= 0 check
const xLinesForHHF = (prefix, hhf) =>
  hhf <= 0
    ? {}
    : {
        ...xLine(
          prefix + "HHF",
          hhf,
          colorForPrefix(prefix, 1),
          extraLabelOffsets[prefix]
        ),
        ...xLine(
          prefix + "GM",
          0.95 * hhf,
          colorForPrefix(prefix, 0.7),
          extraLabelOffsets[prefix]
        ),
        ...xLine(
          prefix + "M",
          0.85 * hhf,
          colorForPrefix(prefix, 0.5),
          extraLabelOffsets[prefix]
        ),
        ...xLine(
          prefix + "A",
          0.75 * hhf,
          colorForPrefix(prefix, 0.4),
          extraLabelOffsets[prefix]
        ),
        ...xLine(
          prefix + "B",
          0.6 * hhf,
          colorForPrefix(prefix, 0.3),
          extraLabelOffsets[prefix]
        ),
        ...xLine(
          prefix + "C",
          0.4 * hhf,
          colorForPrefix(prefix, 0.2),
          extraLabelOffsets[prefix]
        ),
        ...point(
          prefix + "GM/1",
          0.95 * hhf,
          1,
          colorForPrefix(prefix, 0.7),
          extraLabelOffsets[prefix]
        ),
        ...point(
          prefix + "M/5",
          0.85 * hhf,
          5,
          colorForPrefix(prefix, 0.5),
          extraLabelOffsets[prefix]
        ),
        ...point(
          prefix + "A/15",
          0.75 * hhf,
          15,
          colorForPrefix(prefix, 0.4),
          extraLabelOffsets[prefix]
        ),
        ...point(
          prefix + "B/40",
          0.6 * hhf,
          40,
          colorForPrefix(prefix, 0.3),
          extraLabelOffsets[prefix]
        ),
        ...point(
          prefix + "C/75",
          0.4 * hhf,
          75,
          colorForPrefix(prefix, 0.2),
          extraLabelOffsets[prefix]
        ),
      };

// TODO: different modes for class xLines (95/85/75-hhf, A-centric, 1/5/15/40/75-percentile, etc)
// TODO: maybe for HHF mode allow choosing different HHFs from another dropdown
// TODO: maybe split the modes into 2 dropdowns, one of xLines, one for yLines to play with
// TODO: maybe different options / scale depending on viewport size and desktop/tablet/mobile
// TODO: all vs current search mode
export const ScoresChart = ({
  division,
  classifier,
  hhf,
  recommendedHHF1,
  recommendedHHF5,
  recommendedHHF15,
}) => {
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
            radius: 3,
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: ({ raw: { x, y, p, memberNumber } }) =>
                `${memberNumber}: ${x}HF`,
              //`HF ${x}, Top ${y}%: ${memberNumber}(${p.toFixed(2)}%)`,
            },
          },
          annotation: {
            annotations: {
              ...yLine("1th", 1, annotationColor(0.7)),
              ...yLine("5th", 5, annotationColor(0.5)),
              ...yLine("15th", 15, annotationColor(0.4)),
              ...yLine("40th", 40, annotationColor(0.3)),
              ...yLine("75th", 75, annotationColor(0.2)),

              ...xLinesForHHF("", hhf),
              ...xLinesForHHF("r1", recommendedHHF1),
              ...xLinesForHHF("r5", recommendedHHF5),
              ...xLinesForHHF("r15", recommendedHHF15),
            },
          },
        },
      }}
      data={{
        datasets: [
          {
            label: "HF / Percentile",
            data,
            pointBorderColor: "white",
            pointBorderWidth: 0,
            backgroundColor: "#ae9ef1",
            pointBackgroundColor: data.map((c) => {
              return bgColorForClass[classForPercent(c.p)];
              return `rgb(255,0,0)`;
            }),
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
