import { useWindowWidth } from "@react-hook/window-size";
import cx from "classnames";
import { uniqBy } from "lodash";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "use-debounce";

import { Percent, PositiveOrMinus1 } from "../../../../api/src/dataUtil/numbers";
import { sportForDivision } from "../../../../shared/constants/divisions";
import { classForELO, classForPercent } from "../../../../shared/utils/classification";
import { correlation, weibulCDFFactory } from "../../../../shared/utils/weibull";
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
  "%": "scoreRecPercent",
  Rank: "rank",
  ELO: "elo",
  Classification: "recPercentUncapped",
  ClassificationHigh: "recPercentUncappedHigh",
};
const versusModeLabelMap = {
  HF: "HF",
  "%": "Percent",
  Rank: "Percentile",
  ELO: "ELO",
  Classification: "Rec. Classification",
};
const versusDefaultClassificationMode: VersusMode = "Classification";
const versusFieldForMode = mode => versusModeMap[mode];
const versusModes = Object.keys(versusModeMap);

type VersusMode = keyof typeof versusModeMap;
const filterXYForModes = (
  data: AdvancedScorePoint[],
  xMode: VersusMode,
  yMode: VersusMode,
) => {
  let result = data;

  if (xMode !== "Rank") {
    result = result.filter(c => c.x > 0);
  }

  if (yMode !== "Rank") {
    result = result.filter(c => c.y > 0);
  }

  return result;
};

const colorForELOOrPercent = (colorMode: string, dataPoint: AdvancedScorePoint) => {
  return "#444";
  const field = versusFieldForMode(colorMode);
  if (field === "elo") {
    return bgColorForClass[classForELO(dataPoint.elo as number)];
  }
  return bgColorForClass[classForPercent(dataPoint[versusFieldForMode(colorMode)])];
};

const colorForPrefix = (prefix, alpha) => "black";
export const extraLabelOffsets = {
  hq: 0,
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
  )[0];

const xLinesForHHF = (prefix: string, hhf: number) =>
  hhf <= 0
    ? {}
    : {
        ...xLine(
          `${prefix}HHF = ${hhf?.toFixed(4)}`,
          hhf,
          colorForPrefix(prefix, 1),
          prefix.startsWith("hq") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
        ...xLine(
          `${prefix}GM`,
          0.95 * hhf,
          colorForPrefix(prefix, 0.8),
          prefix.startsWith("hq") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
        ...xLine(
          `${prefix}M`,
          0.85 * hhf,
          colorForPrefix(prefix, 0.6),
          prefix.startsWith("hq") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
        ...xLine(
          `${prefix}A`,
          0.75 * hhf,
          colorForPrefix(prefix, 0.5),
          prefix.startsWith("hq") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
        ...xLine(
          `${prefix}B`,
          0.6 * hhf,
          colorForPrefix(prefix, 0.4),
          prefix.startsWith("hq") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
        ...xLine(
          `${prefix}C`,
          0.4 * hhf,
          colorForPrefix(prefix, 0.3),
          prefix.startsWith("hq") ? 20 : 0, // extraLabelOffsets[prefix],
          true,
        ),
      };

const SCORES_STEP = 50;

// point for graph coming from API
interface AdvancedScorePoint extends GraphPoint {
  memberNumber: string;

  date: number;
  elo: number;
  hf: number;
}
const urlWithParams = (
  division: string,
  classifier: string,
  full: boolean,
  limit: number,
) => `/classifiers/${division}/${classifier}/chart?full=${full ? 1 : 0}&limit=${limit}`;

const dataForModes = (
  incomingData: AdvancedScorePoint[] | null,
  xMode: VersusMode,
  yMode: VersusMode,
  colorMode: VersusMode,
  prodMode: string,
) => {
  const prodData =
    prodMode === "All"
      ? incomingData
      : prodMode === "Prod. 10"
        ? incomingData?.filter(c => c.date < 1706770800000)
        : incomingData?.filter(c => c.date >= 1706770800000);
  let sorted = (prodData?.toSorted((a, b) => b.hf - a.hf) || []).map((c, i, all) => ({
    ...c,
    rank: PositiveOrMinus1(Percent(i, all.length)),
  }));

  if ([xMode, yMode].includes("ELO")) {
    sorted = sorted.filter(c => c.elo > 0);
    sorted = uniqBy(sorted, c => c.memberNumber);
  } else if ([colorMode].includes("ELO")) {
    sorted = sorted.filter(c => c.elo > 0);
  }

  const withXY = sorted.map(c => ({
    ...c,
    x: c[versusFieldForMode(xMode)],
    y: c[versusFieldForMode(yMode)],
    id: c.memberNumber,
  }));
  return filterXYForModes(withXY, xMode, yMode);
};

// TODO: all vs current search mode
export const ScoresChart = ({ division, classifier, hhf, recHHF, totalScores }) => {
  const windowWidth = useWindowWidth({ wait: 400 });
  const [showChartSettings, setShowChartSettings] = useState(windowWidth >= 992);
  useEffect(() => {
    setShowChartSettings(windowWidth >= 992);
  }, [windowWidth]);
  const [colorMode, setColorMode] = useState<VersusMode>(versusDefaultClassificationMode);
  const [xMode, setXMode] = useState<VersusMode>("HF");
  const [yMode, setYMode] = useState<VersusMode>("Rank");
  const [prodMode, setProdMode] = useState("All");

  const [search, setSearch] = useSearchParams();
  const urlParamFull = search.has("full");
  const sport = sportForDivision(division);
  const [full, setFullState] = useState(urlParamFull);
  const [numberOfScores, setNumberOfScores] = useState(
    SCORES_STEP * Math.ceil(totalScores / SCORES_STEP),
  );
  const numberOfScoresUsed = useDebounce(numberOfScores, 300)[0];
  const {
    json: curData,
    loading,
    isFetching,
  } = useApi(urlWithParams(division, classifier, full, numberOfScoresUsed));
  const [lastData, setLastData] = useState<AdvancedScorePoint[] | null>(null);
  useEffect(() => {
    if (curData) {
      setLastData(curData);
    }
  }, [curData]);
  const setFull = useCallback(
    (v: boolean) => {
      setSearch(prev => {
        if (!v) {
          prev.delete("full");
          setXMode("HF");
          setYMode("Rank");
          setColorMode("Classification");
        } else {
          prev.set("full", "");
        }
        return prev;
      });
      setFullState(v);
    },
    [setSearch],
  );

  const data = useMemo(
    () => dataForModes(lastData, xMode, yMode, colorMode, prodMode),
    [lastData, xMode, yMode, colorMode, prodMode],
  );

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

  useEffect(
    () => setNumberOfScores(SCORES_STEP * Math.ceil(totalScores / SCORES_STEP)),
    [totalScores],
  );
  const weibullData: number[] = useMemo(
    () =>
      full
        ? (dataForModes(lastData, "HF", "Rank", "Classification", "All").map(c => c.x) ??
          [])
        : [],
    [lastData, full],
  );
  const weibull = useAsyncWeibull(weibullData);

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

  const { k, lambda, hhf3 } = weibull;
  const percentiles = useMemo(
    () => [
      closestPercentileForHF(recHHF * 0.95, data),
      closestPercentileForHF(recHHF * 0.85, data),
      closestPercentileForHF(recHHF * 0.75, data),
      closestPercentileForHF(recHHF * 0.6, data),
      closestPercentileForHF(recHHF * 0.4, data),
    ],
    [data, recHHF],
  );

  const chartLabel = sport === "hfu" && recHHF ? `Rec. HHF: ${recHHF}` : undefined;

  if (!lastData && loading) {
    return <ProgressSpinner />;
  }

  const graph = (
    <Scatter
      style={{ position: "relative", background: "white" }}
      options={{
        //aspectRatio: full ? 1 : undefined,
        responsive: true,
        // wanted false for rezize but annotations are bugged and draw HHF/GM lines wrong
        maintainAspectRatio: false,
        scales: {
          y: {
            reverse: yMode === "Rank",
            grid: {
              color: "black",
              tickColor: "black",
              lineWidth: 2,
              tickWidth: 2,
            },
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
                if (pointsGraphName || !full) {
                  return null;
                }
                return `${memberNumber} ${name}; ${versusModeLabelMap[xMode]}: ${x.toFixed(4)}; ${versusModeLabelMap[yMode]}: ${y.toFixed(4)}; ${new Date(date).toLocaleDateString()}`;
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
              ...(!showWeibull
                ? {}
                : Object.assign(
                    {},
                    ...percentiles.map((perc, i) =>
                      point(
                        ["pGM", "pM", "pA", "pB", "pC"][i] + recHHF,
                        recHHF * [0.95, 0.85, 0.75, 0.6, 0.4][i],
                        perc,
                        colorForPrefix("r", 0.7),
                      ),
                    ),
                  )),

              // ...(sport === "uspsa" || sport === "scsa" ? xLinesForHHF("", hhf) : []),
              ...(xMode !== "HF" ? {} : xLinesForHHF("r", recHHF)),
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
                  pointBackgroundColor: wbl1AnnotationColor(0.33),
                },
              ]),
          {
            label: chartLabel || "HF / Percentile",
            data: data,
            pointRadius: 2,
            pointBorderColor: "white",
            pointBorderWidth: 0,
            backgroundColor: "white",
            borderColor: "black",
            borderWidth: 2,
            pointBackgroundColor: data?.map(c => colorForELOOrPercent(colorMode!, c)),
          },
        ],
      }}
    />
  );

  if (full) {
    return (
      <Dialog
        draggable={false}
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
            style={{ top: -48, left: 0 }}
            className="absolute z-1 flex flex-column justify-content-start align-items-center gap-2 pointer-events-none"
          >
            <div className="flex flex-column-reverse gap-2 justify-content-center align-items-center">
              <div className="relative flex gap-2 mt-4 justify-content-around text-base lg:text-xl">
                <Button
                  className="absolute lg:hidden pointer-events-auto"
                  style={{ position: "relative", left: 0, top: -8, width: 48 }}
                  rounded
                  text
                  icon={cx("pi pi-cog", { "text-color-secondary": !showChartSettings })}
                  onClick={() => setShowChartSettings(prev => !prev)}
                />
                <div
                  className={cx(
                    "flex-wrap gap-4 border-round border-1 p-4 surface-card mt-6 lg:mt-0 mr-8 ml-4 pointer-events-auto justify-content-evenly",
                    {
                      hidden: !showChartSettings,
                      flex: showChartSettings,
                    },
                  )}
                >
                  <div className="flex flex-column justify-content-center align-items-start gap-1">
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
                  <div className="flex flex-column justify-content-center align-items-start gap-1">
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
                  <div className="flex flex-column justify-content-center align-items-start gap-1">
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
                  {division === "prod" && (
                    <div className="flex flex-column justify-content-end align-items-start ml-8">
                      <SelectButton
                        className="compact text-xs"
                        allowEmpty={false}
                        options={["All", "Prod. 10", "Prod. 15"]}
                        value={prodMode}
                        onChange={e => setProdMode(e.value)}
                      />
                    </div>
                  )}
                  {showCorrelation && (
                    <div className="flex gap-4 text-sm">
                      <div className="flex flex-column justify-content-center text-md text-500 font-bold">
                        <div>Correlation = {correl.toFixed(6)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {sport === "uspsa" && showWeibull && (
          <div
            style={{ bottom: 96, right: 64 }}
            className="absolute z-1 hidden lg:flex flex-column justify-content-start align-items-center gap-2 surface-card mx-4 my-0 border-round border-1 p-4"
          >
            <div className="flex flex-column justify-content-center gap-2">
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
              <WeibullStatus weibull={weibull} showHHF />
            </div>
            <div className="hidden">
              <div className="flex justify-content-center gap-4">
                <div>k = {k?.toFixed(5)}</div>
                <div>λ = {lambda?.toFixed(5)}</div>
                <div>wbl5 = {hhf3?.toFixed(4)}</div>
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
