import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

import { sportForDivision } from "../../../../shared/constants/divisions";
import { classForPercent } from "../../../../shared/utils/classification";
import { fuzzyEqual } from "../../../../shared/utils/hitfactor";
import { emptyWeibull, solveWeibull } from "../../../../shared/utils/weibull";
import { useApi } from "../../utils/client";
import { bgColorForClass } from "../../utils/color";

import {
  point,
  Scatter,
  yLine,
  xLine,
  annotationColor,
  wbl1AnnotationColor,
  wbl5AnnotationColor,
  wbl15AnnotationColor,
  r5annotationColor,
  r15annotationColor,
  r1annotationColor,
  pointsGraph,
} from "./common";

const modes = [
  "HQ",
  "Recommended",
  "Rec1",
  "Rec5",
  "Rec15",
  "Wbl1",
  "Wbl5",
  "Wbl15",
] as const;
type Mode = (typeof modes)[number];
const shortModeNames = ["", "r", "r1", "r5", "r15", "wbl1", "wbl5", "wbl15"];

const colorForPrefix = (prefix, alpha) =>
  ({
    "": annotationColor,
    r: r5annotationColor,
    r1: r5annotationColor,
    r5: r5annotationColor,
    r15: r5annotationColor,
    wbl1: wbl15AnnotationColor,
    wbl5: wbl15AnnotationColor,
    wbl15: wbl15AnnotationColor,
  })[prefix](alpha);
export const extraLabelOffsets = {
  "": 0,
  r: 5,
  r1: 5,
  r5: 15,
  r15: 20,
  wbl1: 10,
  wbl5: 20,
  wbl15: 30,
};

// data must be sorted ascending
interface GraphPoint {
  x: number;
  y: number;
}
const closestPercentileForHF = (hf: number, dataRaw: GraphPoint[]): number => {
  if (!dataRaw?.length) {
    return -1;
  }

  const perfect = dataRaw.find(c => fuzzyEqual(hf, c.x, 0.01));
  if (perfect) {
    return perfect.y;
  }

  const data = dataRaw.toSorted((a, b) => a.x - b.x);
  let lowIndex = data.findLastIndex(c => c.x < hf);
  let highIndex = data.findIndex(c => c.x > hf);
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
  const result = startPoint.y + k * (hf - startPoint.x);
  return result;
};

const xLinesForHHF = (prefix: string, hhf: number) =>
  hhf <= 0
    ? {}
    : {
        ...xLine(
          `HHF = ${hhf.toFixed(4)}`,
          hhf,
          colorForPrefix(prefix, 1),
          0, // extraLabelOffsets[prefix],
        ),
        ...xLine(
          `GM`,
          0.95 * hhf,
          colorForPrefix(prefix, 0.8),
          0, // extraLabelOffsets[prefix],
        ),
        ...xLine(
          `M`,
          0.85 * hhf,
          colorForPrefix(prefix, 0.6),
          0, // extraLabelOffsets[prefix],
        ),
        ...xLine(
          `A`,
          0.75 * hhf,
          colorForPrefix(prefix, 0.5),
          0, // extraLabelOffsets[prefix],
        ),
        ...xLine(
          `B`,
          0.6 * hhf,
          colorForPrefix(prefix, 0.4),
          0, // extraLabelOffsets[prefix],
        ),
        ...xLine(
          `C`,
          0.4 * hhf,
          colorForPrefix(prefix, 0.3),
          0, // extraLabelOffsets[prefix],
        ),
      };

// Used for point color and hover info classificaiton text
const modeBucketForMode = (mode?: Mode) =>
  (
    ({
      HQ: "curHHFPercent",
      Recommended: "recPercent",
      Rec1: "recPercent",
      Rec5: "recPercent",
      Rec15: "recPercent",
      Wbl1: "recPercent",
      Wbl5: "recPercent",
      Wbl15: "recPercent",
    }) as Record<Mode, string>
  )[mode || "Rec1"];

const SCORES_STEP = 50;

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
  totalScores,
}) => {
  const sport = sportForDivision(division);
  const [full, setFull] = useState(false);
  const [mode, setMode] = useState(modes[1]);
  const [numberOfScores, setNumberOfScores] = useState(
    SCORES_STEP * Math.ceil(totalScores / SCORES_STEP),
  );
  const numberOfScoresUsed = useDebounce(numberOfScores, 300)[0];
  const {
    json: curData,
    loading,
    isFetching,
  } = useApi(
    `/classifiers/${division}/${classifier}/chart?full=${full ? 1 : 0}&limit=${numberOfScoresUsed}`,
  );
  const [lastData, setLastData] = useState<GraphPoint[] | null>(null);
  useEffect(() => {
    if (curData) {
      setLastData(curData);
    }
  }, [curData]);
  const data: any = lastData;

  const sortedByHFData = useMemo(
    () => lastData?.toSorted((a, b) => b.x - a.x),
    [lastData],
  );

  const [precision, setPrecision] = useState(30);
  const precisionUsed = useDebounce(precision, 300)[0];
  useEffect(
    () => setNumberOfScores(SCORES_STEP * Math.ceil(totalScores / SCORES_STEP)),
    [totalScores],
  );
  const weibull = useMemo(
    () =>
      !full
        ? emptyWeibull
        : solveWeibull(
            data?.map(c => c.x),
            precisionUsed,
          ),
    [full, data, precisionUsed],
  );
  const partialScoresDate = useMemo(() => {
    if (!data?.length) {
      return "";
    }

    const sortedByDate = data?.toSorted((a, b) => b.date - a.date);
    const last = new Date(sortedByDate[0].date);
    const first = new Date(sortedByDate[sortedByDate.length - 1].date);

    const lengthInMonths = `(${Math.floor((last.getTime() - first.getTime()) / 2_592_000_000)} mo)`;

    return [
      `${first.toLocaleDateString()} — ${last.toLocaleDateString()}`,
      lengthInMonths,
    ];
  }, [data]);

  const { k, lambda, cdf, hhf1, hhf5, hhf15 } = weibull;
  const maxHF = Math.ceil(sortedByHFData?.[0].x || 0);
  const minHF = 0;
  const modeHHFs = {
    HQ: hhf,
    Recommended: recHHF,
    Rec1: recommendedHHF1,
    Rec5: recommendedHHF5,
    Rec15: recommendedHHF15,
    Wbl1: hhf1,
    Wbl5: hhf5,
    Wbl15: hhf15,
  } as Record<Mode, number>;
  const modeIndex = modes.indexOf(mode);
  const curShortMode = shortModeNames[modeIndex];
  const curModeHHF = modeHHFs[mode];

  const percentiles = useMemo(
    () => [
      closestPercentileForHF(curModeHHF * 0.95, data),
      closestPercentileForHF(curModeHHF * 0.85, data),
      closestPercentileForHF(curModeHHF * 0.75, data),
      closestPercentileForHF(curModeHHF * 0.6, data),
      closestPercentileForHF(curModeHHF * 0.4, data),
    ],
    [data, curModeHHF],
  );

  const chartLabel = sport === "hfu" && recHHF ? `Rec. HHF: ${recHHF}` : undefined;

  if (!lastData && loading) {
    return <ProgressSpinner />;
  }

  const graph = (
    <Scatter
      style={{ position: "relative", height: "74vh" }}
      options={{
        responsive: true,
        // wanted false for rezize but annotations are bugged and draw HHF/GM lines wrong
        maintainAspectRatio: false,
        scales: {
          y: { reverse: true, min: -10, max: 100 },
          x: {
            min: 0,
            max:
              Math.max(
                maxHF,
                hhf,
                recHHF,
                recommendedHHF1,
                recommendedHHF5,
                recommendedHHF15,
                hhf1,
                hhf5,
                hhf15,
              ) + 0.5,
          },
        },
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
                  return null;
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
              ...Object.assign(
                {},
                ...percentiles.map((perc, i) =>
                  yLine(
                    `Top ${perc.toFixed(2)}% = ${["GM", "M", "A", "B", "C"][i]}`,
                    perc,
                    colorForPrefix(curShortMode, 0.7 - 0.1 * i),
                  ),
                ),
              ),
              ...Object.assign(
                {},
                ...percentiles.map((perc, i) =>
                  point(
                    ["pGM", "pM", "pA", "pB", "pC"][i] + curModeHHF,
                    curModeHHF * [0.95, 0.85, 0.75, 0.6, 0.4][i],
                    perc,
                    colorForPrefix(curShortMode, 0.7),
                    0, // extraLabelOffsets[prefix],
                  ),
                ),
              ),

              // TODO: fix multisport here
              // ...(sport === "uspsa" || sport === "scsa" ? xLinesForHHF("", hhf) : []),
              ...xLinesForHHF(curShortMode, curModeHHF),
            },
          },
        },
      }}
      data={{
        datasets: [
          ...(!full
            ? []
            : [
                {
                  label: "Weibull",
                  data: pointsGraph({
                    yFn: cdf,
                    minX: minHF,
                    maxX: maxHF,
                    name: "Weibull",
                  }),
                  pointRadius: 1,
                  pointBorderColor: "black",
                  pointBorderWidth: 0,
                  pointBackgroundColor: wbl1AnnotationColor(0.66),
                },
              ]),
          {
            label: chartLabel || "HF / Percentile",
            data: data?.map(c => ({ ...c, id: `${c.date}:${c.x}` })),
            pointRadius: 3,
            pointBorderColor: "white",
            pointBorderWidth: 0,
            backgroundColor: "#ae9ef1",
            pointBackgroundColor: data?.map(c => {
              if (sport === "scsa") {
                return bgColorForClass[classForPercent(c.scoreRecPercent || 0)];
              }

              const shooterClass = classForPercent(c[modeBucketForMode(mode)]);
              return bgColorForClass[shooterClass];
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
        {isFetching && (
          <div className="absolute w-full h-full z-1 flex justify-content-center align-items-center">
            <ProgressSpinner />
          </div>
        )}
        {sport === "uspsa" && (
          <div className="absolute w-full z-1 flex flex-column justify-content-center align-items-center gap-2">
            <div className="flex justify-content-between m-auto w-full surface-card">
              <SelectButton
                className="compact text-xs md:text-base"
                allowEmpty={false}
                options={modes as unknown as string[]}
                value={mode}
                onChange={e => setMode(e.value)}
                style={{ margin: "auto", transform: "scale(0.65)" }}
              />
            </div>
            <div className="flex flex-row justify-content-center">
              <div className="flex flex-column justify-content-center align-items-center gap-2">
                Weibull Precision:{" "}
                <input
                  className="w-8"
                  type="number"
                  name="precision"
                  step={1}
                  value={precision}
                  onChange={e => setPrecision(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-column justify-content-center align-items-center gap-2">
                Scores:{" "}
                <input
                  className="w-8"
                  type="number"
                  name="points"
                  step={SCORES_STEP}
                  value={numberOfScores}
                  onChange={e => setNumberOfScores(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="text-sm">{partialScoresDate[0]}</div>
            <div className="text-sm">{partialScoresDate[1]}</div>
            <div className="hidden">
              <div className="flex justify-content-center gap-4">
                <div>k = {k?.toFixed(5)}</div>
                <div>λ = {lambda?.toFixed(5)}</div>
                <div>wbl5 = {hhf5?.toFixed(4)}</div>
              </div>
            </div>
          </div>
        )}
        {graph}
      </Dialog>
    );
  }

  return (
    <div className="relative h-full" style={{ margin: -2 }}>
      {isFetching && (
        <div className="absolute w-full h-full z-1 flex justify-content-center align-items-center">
          <ProgressSpinner />
        </div>
      )}
      {sport === "uspsa" && (
        <div className="absolute" style={{ zIndex: 1, left: 0 }}>
          <SelectButton
            className="compact text-xs md:text-base"
            allowEmpty={false}
            options={(modes as unknown as string[]).slice(0, 5)}
            value={mode}
            onChange={e => setMode(e.value)}
            style={{ transform: "scale(0.65)" }}
          />
        </div>
      )}
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
