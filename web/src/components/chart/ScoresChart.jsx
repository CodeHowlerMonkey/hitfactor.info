import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import {
  point,
  Scatter,
  yLine,
  xLine,
  annotationColor,
  r5annotationColor,
  r15annotationColor,
  r1annotationColor,
} from "./common";
import { useApi } from "../../utils/client";
import { useState } from "react";
import { classForPercent } from "../../../../shared/utils/classification";
import { bgColorForClass } from "../../utils/color";
import { SelectButton } from "primereact/selectbutton";

const colorForPrefix = (prefix, alpha) =>
  ({
    "": annotationColor,
    r: r5annotationColor, // green for recommended
    r1: r1annotationColor,
    r5: r5annotationColor,
    r15: r15annotationColor,
  }[prefix](alpha));
const extraLabelOffsets = {
  "": 0,
  r: 5, // show close like r1
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
          prefix + "GM/0.9",
          0.95 * hhf,
          0.9,
          colorForPrefix(prefix, 0.7),
          extraLabelOffsets[prefix]
        ),
        ...point(
          prefix + "M/4.75",
          0.85 * hhf,
          4.75,
          colorForPrefix(prefix, 0.5),
          extraLabelOffsets[prefix]
        ),
        ...point(
          prefix + "A/14.5",
          0.75 * hhf,
          14.5,
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
          prefix + "C/80",
          0.4 * hhf,
          80,
          colorForPrefix(prefix, 0.2),
          extraLabelOffsets[prefix]
        ),
      };

// "Cur. HHF Percent" => curHHFPercent
const modeBucketForMode = (mode) =>
  ({
    Official: "curPercent",
    "Historical CHHF": "historicalCurHHFPercent",
    "Current CHHF": "curHHFPercent",
    Recommended: "recPercent",
  }[mode]);

// TODO: different modes for class xLines (95/85/75-hhf, A-centric, 1/5/15/40/75-percentile, etc)
// TODO: maybe split the modes into 2 dropdowns, one of xLines, one for yLines to play with
// TODO: maybe different options / scale depending on viewport size and desktop/tablet/mobile
// TODO: all vs current search mode
export const ScoresChart = ({
  division,
  classifier,
  hhf,
  recHHF,
  recommendedHHF1,
  recommendedHHF5,
  recommendedHHF15,
}) => {
  const [full, setFull] = useState(false);
  const modes = ["Official", "Historical CHHF", "Current CHHF", "Recommended"];
  const [mode, setMode] = useState(modes[0]);
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
              label: ({ raw, raw: { x, y, memberNumber } }) =>
                `HF ${x}, Top ${y}%: ${memberNumber}(${raw[
                  modeBucketForMode(mode)
                ].toFixed(2)}%)`,
            },
          },
          annotation: {
            annotations: {
              ...yLine("0.9th", 0.9, annotationColor(0.7)),
              ...yLine("4.75th", 4.75, annotationColor(0.5)),
              ...yLine("14.5th", 14.5, annotationColor(0.4)),
              ...yLine("40th", 40, annotationColor(0.3)),
              ...yLine("80th", 80, annotationColor(0.2)),

              ...xLinesForHHF("", hhf),
              ...(recHHF
                ? xLinesForHHF("r", recHHF)
                : {
                    ...xLinesForHHF("r1", recommendedHHF1),
                    ...xLinesForHHF("r5", recommendedHHF5),
                    ...xLinesForHHF("r15", recommendedHHF15),
                  }),
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
            pointBackgroundColor: data.map(
              (c) =>
                bgColorForClass[classForPercent(c[modeBucketForMode(mode)])]
            ),
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
        <div
          style={{
            position: "absolute",
            top: "24px",
            display: "flex",
            justifyContent: "space-between",
            left: 0,
            right: 0,
            margin: "auto",
            width: "50%",
          }}
        >
          <SelectButton
            options={modes}
            value={mode}
            onChange={(e) => setMode(e.value)}
            style={{ margin: "auto", transform: "scale(0.65)" }}
          />
        </div>
        {graph}
      </Dialog>
    );
  }

  return (
    <div
      style={{
        maxHeight: "100%",
      }}
    >
      <div className="flex justify-space-around">
        <SelectButton
          options={modes}
          value={mode}
          onChange={(e) => setMode(e.value)}
          style={{ margin: "auto", transform: "scale(0.65)" }}
        />
      </div>
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
    </div>
  );
};

export default ScoresChart;
