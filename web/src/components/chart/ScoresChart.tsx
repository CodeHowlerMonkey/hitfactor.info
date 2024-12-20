import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useMemo, useState } from "react";

import { sportForDivision } from "../../../../shared/constants/divisions";
import { classForPercent } from "../../../../shared/utils/classification";
import { solveWeibull } from "../../../../shared/utils/weibull";
import { useApi } from "../../utils/client";
import { bgColorForClass } from "../../utils/color";

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

const pointsGraph = ({ yFn, minX, maxX, name }) => {
  if (!yFn || minX === maxX) {
    return [];
  }

  const step = 0.005;
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

const colorForPrefix = (prefix, alpha) =>
  ({
    "": annotationColor,
    r: r5annotationColor, // green for recommended
    r1: r1annotationColor,
    r5: r5annotationColor,
    r15: r15annotationColor,
    wbl1: r1annotationColor,
    wbl5: r5annotationColor,
    wbl15: r15annotationColor,
  })[prefix](alpha);
const extraLabelOffsets = {
  "": 0,
  r: 5, // show close like r1
  r1: 5,
  r5: 15,
  r15: 20,
  wbl1: 5,
  wbl5: 15,
  wbl15: 20,
};

// TODO: #23 Fix Negative Recommended HHFs Properly, so we don't need  hhf <= 0 check
const xLinesForHHF = (prefix, hhf) =>
  hhf <= 0
    ? {}
    : {
        ...xLine(
          `${prefix}HHF`,
          hhf,
          colorForPrefix(prefix, 1),
          extraLabelOffsets[prefix],
        ),
        ...xLine(
          `${prefix}GM`,
          0.95 * hhf,
          colorForPrefix(prefix, 0.7),
          extraLabelOffsets[prefix],
        ),
        ...xLine(
          `${prefix}M`,
          0.85 * hhf,
          colorForPrefix(prefix, 0.5),
          extraLabelOffsets[prefix],
        ),
        ...xLine(
          `${prefix}A`,
          0.75 * hhf,
          colorForPrefix(prefix, 0.4),
          extraLabelOffsets[prefix],
        ),
        ...xLine(
          `${prefix}B`,
          0.6 * hhf,
          colorForPrefix(prefix, 0.3),
          extraLabelOffsets[prefix],
        ),
        ...xLine(
          `${prefix}C`,
          0.4 * hhf,
          colorForPrefix(prefix, 0.2),
          extraLabelOffsets[prefix],
        ),
        ...point(
          `${prefix}GM/1`,
          0.95 * hhf,
          1.0,
          colorForPrefix(prefix, 0.7),
          extraLabelOffsets[prefix],
        ),
        ...point(
          `${prefix}M/4.75`,
          0.85 * hhf,
          4.75,
          colorForPrefix(prefix, 0.5),
          extraLabelOffsets[prefix],
        ),
        ...point(
          `${prefix}A/14.5`,
          0.75 * hhf,
          14.5,
          colorForPrefix(prefix, 0.4),
          extraLabelOffsets[prefix],
        ),
        ...point(
          `${prefix}B/40`,
          0.6 * hhf,
          40,
          colorForPrefix(prefix, 0.3),
          extraLabelOffsets[prefix],
        ),
        ...point(
          `${prefix}C/80`,
          0.4 * hhf,
          80,
          colorForPrefix(prefix, 0.2),
          extraLabelOffsets[prefix],
        ),
      };

// "Cur. HHF Percent" => curHHFPercent
const modeBucketForMode = (mode?: "Official" | "Current CHHF" | "Recommended"): string =>
  ({
    Official: "curPercent",
    "Current CHHF": "curHHFPercent",
    Recommended: "recPercent",
  })[mode || "Recommended"];

const modes = ["Wbl1 (99th = 95%)", "Wbl5 (95th = 85%)", "Wbl15 (85th = 75%)"];

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
  const sport = sportForDivision(division);
  const [full, setFull] = useState(false);
  const [mode, setMode] = useState(modes[0]);
  const { json: data, loading } = useApi(
    `/classifiers/${division}/${classifier}/chart?full=${full ? 1 : 0}`,
  );

  const chartLabel = sport === "hfu" && recHHF ? `Rec. HHF: ${recHHF}` : undefined;

  const weibull = useMemo(() => solveWeibull(data?.map(c => c.x)), [data]);
  const { k, lambda, cdf, hhf1, hhf5, hhf15 } = weibull;
  const maxHF = data?.[0].x || 0;
  const minHF = data?.[data?.length - 1].x || 0;
  const modeRecHHFs = [hhf1, hhf5, hhf15];
  const xLinesForModeIndex = modeIndex => {
    const shortModeNames = ["wbl1", "wbl5", "wbl15"];
    return xLinesForHHF(shortModeNames[modeIndex], modeRecHHFs[modeIndex]);
  };

  if (loading) {
    return <ProgressSpinner />;
  }

  const graph = (
    <Scatter
      style={{ position: "relative" }}
      options={{
        responsive: true,
        // wanted false for rezize but annotations are bugged and draw HHF/GM lines wrong
        maintainAspectRatio: false,
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
              label: ({ raw, raw: { x, y, memberNumber, pointsGraphName } }) => {
                if (pointsGraphName) {
                  return `${pointsGraphName} HF ${x.toFixed(4)}, Top ${y.toFixed(2)}%)`;
                }
                // TODO: show classificaiton for SCSA when available
                const classification =
                  sport !== "scsa" ? `(${raw[modeBucketForMode()].toFixed(2)}%)` : "";
                return `HF ${x.toFixed(4)}, Top ${y.toFixed(2)}%: ${memberNumber}${classification}`;
              },
            },
          },
          annotation: {
            annotations: {
              ...yLine("1th", 1.0, annotationColor(0.7)),
              ...yLine("4.75th", 4.75, annotationColor(0.5)),
              ...yLine("14.5th", 14.5, annotationColor(0.4)),
              ...yLine("40th", 40, annotationColor(0.3)),
              ...yLine("80th", 80, annotationColor(0.2)),

              ...(sport === "uspsa" || sport === "scsa" ? xLinesForHHF("", hhf) : []),
              ...xLinesForModeIndex(modes.indexOf(mode)),
            },
          },
        },
      }}
      data={{
        datasets: [
          {
            label: "Weibull",
            data: pointsGraph({
              yFn: cdf,
              minX: minHF,
              maxX: maxHF * 1.1,
              name: "Weibull",
            }),
            pointRadius: 1.0,
            pointBorderColor: "black",
            pointBorderWidth: 0,
            pointBackgroundColor: annotationColor(0.7),
          },
          {
            label: chartLabel || "HF / Percentile",
            data,
            pointBorderColor: "white",
            pointBorderWidth: 0,
            backgroundColor: "#ae9ef1",
            pointBackgroundColor: data?.map(c => {
              if (sport === "scsa") {
                return bgColorForClass[classForPercent(c.scoreRecPercent || 0)];
              }

              const shooterClass = classForPercent(c[modeBucketForMode()]);
              return bgColorForClass[shooterClass];
            }),
          },
        ],
      }}
    />
  );

  const modeSelector = (
    <div
      className="absolute flex justify-content-center px-4 pointer-events-none align-items-center flex-column"
      style={{ zIndex: 1, left: 0, right: 0 }}
    >
      <div className="surface-card border-round mt-2 pointer-events-auto">
        <SelectButton
          className="compact text-xs md:text-base"
          allowEmpty={false}
          options={modes}
          value={mode}
          onChange={e => setMode(e.value)}
        />
      </div>
      <div className="mt-2 flex flex-column align-items-center">
        <div>HHF {modeRecHHFs[modes.indexOf(mode)].toFixed(4)} </div>
        <div className="text-sm">{`k = ${k.toFixed(4)}`}</div>
        <div className="text-sm">{`λ = ${lambda.toFixed(4)}`}</div>
      </div>
    </div>
  );

  if (full) {
    return (
      <Dialog
        header="Scores Distribution"
        visible
        style={{ width: "96vw", height: "96vh", margin: "16px" }}
        onHide={() => setFull(false)}
      >
        {modeSelector}
        {graph}
      </Dialog>
    );
  }

  return (
    <div className="relative h-full" style={{ margin: -2 }}>
      {modeSelector}
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
