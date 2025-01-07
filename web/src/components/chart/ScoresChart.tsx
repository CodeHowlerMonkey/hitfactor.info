import { uniqBy } from "lodash";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

import { Percent, PositiveOrMinus1 } from "../../../../api/src/dataUtil/numbers";
import { sportForDivision } from "../../../../shared/constants/divisions";
import { classForELO, classForPercent } from "../../../../shared/utils/classification";
import {
  correlation,
  DEFAULT_PRECISION,
  weibulCDFFactory,
} from "../../../../shared/utils/weibull";
import { useApi } from "../../utils/client";
import { bgColorForClass } from "../../utils/color";

import {
  point,
  Scatter,
  yLine,
  xLine,
  annotationColor,
  wbl1AnnotationColor,
  wbl15AnnotationColor,
  r5annotationColor,
  pointsGraph,
} from "./common";
import { closestYForX } from "./common";
import { GraphPoint } from "./common";
import { useAsyncWeibull } from "./useAsyncWeibull";
import { WeibullStatus } from "./WeibullStatus";

const versusModeMap = {
  HF: "hf",
  Percent: "scoreRecPercent",
  Rank: "rank",
  ELO: "elo",
  /*
  HQ: "curPercent",
  "Cur.HHF": "curHHFPercent",
  "Rec.HHFOnly": "recHHFOnlyPercent",
  "Rec.Soft": "recSoftPercent",
  "Rec.Brutal": "recPercent",
  */
  "Rec.Brutal Uncapped": "recPercentUncapped",
};
const versusDefaultClassificationMode = Object.keys(versusModeMap).pop();
const versusFieldForMode = mode => versusModeMap[mode];
const versusModes = Object.keys(versusModeMap);

const colorForELOOrPercent = (colorMode: string, dataPoint: AdvancedScorePoint) => {
  const field = versusFieldForMode(colorMode);
  if (field === "elo") {
    return bgColorForClass[classForELO(dataPoint.elo as number)];
  }
  return bgColorForClass[classForPercent(dataPoint[versusFieldForMode(colorMode)])];
};

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

const closestPercentileForHF = (hf: number, data: AdvancedScorePoint[]) =>
  closestYForX(
    hf,
    data.map(c => ({ ...c, x: c.hf })),
  );

const xLinesForHHF = (prefix: string, hhf: number) =>
  hhf <= 0
    ? {}
    : {
        ...xLine(
          `HHF = ${hhf?.toFixed(4)}`,
          hhf,
          colorForPrefix(prefix, 1),
          prefix.startsWith("wbl") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
        ...xLine(
          `GM`,
          0.95 * hhf,
          colorForPrefix(prefix, 0.8),
          prefix.startsWith("wbl") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
        ...xLine(
          `M`,
          0.85 * hhf,
          colorForPrefix(prefix, 0.6),
          prefix.startsWith("wbl") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
        ...xLine(
          `A`,
          0.75 * hhf,
          colorForPrefix(prefix, 0.5),
          prefix.startsWith("wbl") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
        ...xLine(
          `B`,
          0.6 * hhf,
          colorForPrefix(prefix, 0.4),
          prefix.startsWith("wbl") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
        ...xLine(
          `C`,
          0.4 * hhf,
          colorForPrefix(prefix, 0.3),
          prefix.startsWith("wbl") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
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

// point for graph coming from API
interface AdvancedScorePoint extends GraphPoint {
  memberNumber: string;

  date: number;
  elo: number;
  hf: number;
}

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
  //const [mainMode, setMainMode] = useState(defaultMainMode);
  // const isVersus = mainModeFieldForMode(mainMode) === "vs";
  const [colorMode, setColorMode] = useState(versusDefaultClassificationMode);
  const [xMode, setXMode] = useState("HF");
  const [yMode, setYMode] = useState("Rank");
  const [prodMode, setProdMode] = useState("Prod. 10");

  const sport = sportForDivision(division);
  const [full, setFull] = useState(false);
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
  const [lastData, setLastData] = useState<AdvancedScorePoint[] | null>(null);
  useEffect(() => {
    if (curData) {
      setLastData(curData);
    }
  }, [curData]);

  const data = useMemo(() => {
    const prodData =
      prodMode === "Prod. 10"
        ? lastData?.filter(c => c.date < 1706770800000)
        : lastData?.filter(c => c.date >= 1706770800000);
    let sorted = (prodData?.toSorted((a, b) => b.hf - a.hf) || []).map((c, i, all) => ({
      ...c,
      rank: PositiveOrMinus1(Percent(i, all.length)),
    }));

    if ([xMode, yMode].includes("ELO")) {
      sorted = sorted.filter(c => c.elo > 0);
      sorted = uniqBy(
        sorted, //.toSorted((a, b) => b.date - a.date),
        c => c.memberNumber,
      );
    } else if ([colorMode].includes("ELO")) {
      sorted = sorted.filter(c => c.elo > 0);
    }

    /*
    if (!isVersus) {
      return sorted.map(c => ({
        ...c,
        x: c.hf,
        y: c.rank,
        id: c.memberNumber,
      }));
    }
      */

    return sorted
      .map(c => ({
        ...c,
        x: c[versusFieldForMode(xMode)],
        y: c[versusFieldForMode(yMode)],
        id: c.memberNumber,
      }))
      .filter(c => c.x > 0 && c.y > 0);
  }, [lastData, xMode, yMode, colorMode, prodMode]);

  const showWeibull = yMode === "Rank" && xMode === "HF";
  const showCorrelation = !showWeibull && data?.length;
  const correl = useMemo(
    () =>
      !showCorrelation
        ? 0
        : correlation(
            data.map(c => c.x),
            data.map(c => c.y),
          ),
    [data, showCorrelation],
  );
  const maxX = useMemo(() => data.toSorted((a, b) => b.x - a.x)[0]?.x || 0, [data]);

  const [precision, setPrecision] = useState(DEFAULT_PRECISION);
  const precisionUsed = useDebounce(precision, 300)[0];
  useEffect(
    () => setNumberOfScores(SCORES_STEP * Math.ceil(totalScores / SCORES_STEP)),
    [totalScores],
  );
  const weibullData: number[] = useMemo(
    () => (full ? (data?.map(c => c.x) ?? []) : []),
    [data, full],
  );
  const weibull = useAsyncWeibull(weibullData, precisionUsed);
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

  const { k, lambda, hhf5 } = weibull;
  const percentiles = useMemo(
    () => [
      closestPercentileForHF(hhf5 * 0.95, data),
      closestPercentileForHF(hhf5 * 0.85, data),
      closestPercentileForHF(hhf5 * 0.75, data),
      closestPercentileForHF(hhf5 * 0.6, data),
      closestPercentileForHF(hhf5 * 0.4, data),
    ],
    [data, hhf5],
  );

  const chartLabel = sport === "hfu" && hhf5 ? `Rec. HHF: ${hhf5}` : undefined;

  if (!lastData && loading) {
    return <ProgressSpinner />;
  }

  const graph = (
    <Scatter
      style={{ position: "relative", height: "74vh" }}
      options={{
        //aspectRatio: full ? 1 : undefined,
        responsive: true,
        // wanted false for rezize but annotations are bugged and draw HHF/GM lines wrong
        maintainAspectRatio: false,
        scales: {
          y: { reverse: yMode === "Rank" },
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
              label: ({ raw: { x, y, memberNumber, name, pointsGraphName, date } }) => {
                if (pointsGraphName) {
                  return null;
                }
                return `${memberNumber} ${name}; X ${x.toFixed(4)}; Y ${y.toFixed(4)}; ${new Date(date).toLocaleDateString()}`;
              },
            },
          },
          annotation: {
            annotations: {
              ...(yMode !== "Rank"
                ? {}
                : Object.assign(
                    {},
                    ...percentiles.map((perc, i) =>
                      yLine(
                        `Top ${perc?.toFixed(2)}% = ${["GM", "M", "A", "B", "C"][i]}`,
                        perc,
                        colorForPrefix("r", 0.7 - 0.1 * i),
                      ),
                    ),
                  )),
              ...(yMode !== "Rank"
                ? {}
                : Object.assign(
                    {},
                    ...percentiles.map((perc, i) =>
                      point(
                        ["pGM", "pM", "pA", "pB", "pC"][i] + hhf5,
                        hhf5 * [0.95, 0.85, 0.75, 0.6, 0.4][i],
                        perc,
                        colorForPrefix("r", 0.7),
                      ),
                    ),
                  )),

              // ...(sport === "uspsa" || sport === "scsa" ? xLinesForHHF("", hhf) : []),
              ...(xMode !== "HF" ? {} : xLinesForHHF("r", recHHF)),
              ...(xMode !== "HF" ? {} : xLinesForHHF("wbl5", hhf5)),
            },
          },
        },
      }}
      data={{
        datasets: [
          ...(!full || !showWeibull
            ? []
            : [
                {
                  label: "Weibull",
                  data: pointsGraph({
                    yFn: weibulCDFFactory(k, lambda),
                    minX: 0,
                    maxX,
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
            data: data,
            pointRadius: 3,
            pointBorderColor: "white",
            pointBorderWidth: 0,
            backgroundColor: "#ae9ef1",
            pointBackgroundColor: data?.map(c => colorForELOOrPercent(colorMode!, c)),
          },
        ],
      }}
    />
  );

  if (full) {
    return (
      <Dialog
        header=""
        visible
        style={{
          width: "calc(100vw - 24px)",
          height: "calc(96vh - 24px)",
          maxHeight: "unset",
        }}
        onHide={() => setFull(false)}
      >
        {isFetching && (
          <div className="absolute w-full h-full z-1 flex justify-content-center align-items-center">
            <ProgressSpinner />
          </div>
        )}
        {sport === "uspsa" && (
          <div
            style={{ top: 0, left: 64 }}
            className="absolute z-1 flex flex-column justify-content-start align-items-center gap-2 surface-card mx-4 my-0"
          >
            <div className="flex flex-column-reverse gap-2 justify-content-center align-items-center">
              {showCorrelation && (
                <div className="flex gap-4 text-sm">
                  <div className="flex flex-column justify-content-center text-md text-500 font-bold">
                    <div>Correlation = {correl.toFixed(6)}</div>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-4 justify-content-around text-base lg:text-xl">
                {/*
              <div className="flex flex-column justify-content-start align-items-start">
                <span className="text-md text-500 font-bold">Mode</span>
                <SelectButton
                  className="compact text-xs"
                  allowEmpty={false}
                  options={mainModes}
                  value={mainMode}
                  onChange={e => setMainMode(e.value)}
                />
              </div>
              */}
                <div className="flex gap-4">
                  <div className="flex flex-column justify-content-center align-items-start">
                    <span style={{ fontSize: "1rem" }} className="text-500 font-bold">
                      Color
                    </span>
                    <SelectButton
                      className="compact text-xs"
                      allowEmpty={false}
                      options={versusModes.filter(c => !["Rank", "HF"].includes(c))}
                      value={colorMode}
                      onChange={e => setColorMode(e.value)}
                    />
                  </div>
                  <div className="flex flex-column justify-content-center align-items-start">
                    <span style={{ fontSize: "1rem" }} className="text-500 font-bold">
                      Position X
                    </span>
                    <SelectButton
                      //disabled={mainModeFieldForMode(mainMode) !== "vs"}
                      className="compact text-xs"
                      allowEmpty={false}
                      options={versusModes}
                      value={xMode}
                      onChange={e => setXMode(e.value)}
                    />
                  </div>
                  <div className="flex flex-column justify-content-center align-items-start">
                    <span style={{ fontSize: "1rem" }} className="text-500 font-bold">
                      Position Y
                    </span>

                    <SelectButton
                      //disabled={mainModeFieldForMode(mainMode) !== "vs"}
                      className="compact text-xs"
                      allowEmpty={false}
                      options={versusModes}
                      value={yMode}
                      onChange={e => setYMode(e.value)}
                    />
                  </div>
                  <div className="flex flex-column justify-content-center align-items-start ml-8">
                    <SelectButton
                      className="compact text-xs"
                      allowEmpty={false}
                      options={["Prod. 10", "Prod. 15"]}
                      value={prodMode}
                      onChange={e => setProdMode(e.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {sport === "uspsa" && showWeibull && (
          <div
            style={{ bottom: 96, right: 64 }}
            className="absolute z-1 flex flex-column justify-content-start align-items-center gap-2 surface-card mx-4 my-0 border-round border-1 p-4"
          >
            <div className="flex flex-column justify-content-center gap-2">
              <div className="flex flex-row justify-content-end align-items-center gap-2">
                Precision:{" "}
                <input
                  type="number"
                  name="precision"
                  step={1}
                  value={precision}
                  onChange={e => setPrecision(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-row justify-content-end align-items-center gap-2">
                Scores:{" "}
                <input
                  type="number"
                  name="points"
                  step={SCORES_STEP}
                  value={numberOfScores}
                  onChange={e => setNumberOfScores(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-column">
                <div className="text-sm text-center">{partialScoresDate[0]}</div>
                <div className="text-sm text-center">{partialScoresDate[1]}</div>
              </div>
              <WeibullStatus weibull={weibull} />
            </div>
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
