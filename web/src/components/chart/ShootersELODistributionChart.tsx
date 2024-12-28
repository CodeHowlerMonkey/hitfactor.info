import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useMemo, useState } from "react";

import coElo from "../../../../data/elo/co.json";
import {
  classForELO,
  classForPercent,
  eloClasses,
} from "../../../../shared/utils/classification";
import { weibulCDFFactory } from "../../../../shared/utils/weibull";
import { useApi } from "../../utils/client";
import { bgColorForClass } from "../../utils/color";

import {
  annotationColor,
  r5annotationColor,
  xLine,
  yLine,
  Scatter,
  wbl1AnnotationColor,
  pointsGraph,
  closestYForX,
} from "./common";
import { useAsyncWeibull } from "./useAsyncWeibull";
import { WeibullStatus } from "./WeibullStatus";

const mainModeMap = {
  "ELO Only": "elo",
  Versus: "vs",
};
const mainModeFieldForMode = mode => mainModeMap[mode];
const mainModes = Object.keys(mainModeMap);
const defaultMainMode = mainModes[0];

const fieldModeMap = {
  ELO: "elo",
  HQ: "curPercent",
  "Cur.HHF": "curHHFPercent",
  "Rec.HHFOnly": "recHHFOnlyPercent",
  "Rec.Soft": "recSoftPercent",
  "Rec.Brutal": "recPercent",
  "Rec.Brutal Uncapped": "recPercentUncapped",
};
const fieldForMode = mode => fieldModeMap[mode];
const modes = Object.keys(fieldModeMap);
const recommendedMode = modes[4];

interface RawDataPoint {
  x: number;
  y: number;
  pointsGraphName?: string;
  name: string;
  rating: number;
  memberNumber: string;
}

interface ShootersELODistributionChartProps {
  division: string;
}

export const ShootersELODistributionChart = ({ division }) => {
  const [mainMode, setMainMode] = useState(defaultMainMode);
  const [colorMode, setColorMode] = useState(recommendedMode);
  const [xMode, setXMode] = useState(recommendedMode);
  const [yMode, setYMode] = useState(recommendedMode);

  // const { json: data, loading } = useApi(`/shooters/${division}/chart`);
  const data = coElo;
  const loading = false;

  const curModeData = useMemo(() => {
    if (mainModeFieldForMode(mainMode) === "elo") {
      const s = coElo.map((c, i, all) => ({
        ...c,
        x: c.rating,
        y: (100 * i) / all.length,
      }));
      console.log(JSON.stringify(s[0]));
      return s;
    }

    // TODO: pick x/y
    return (
      data
        ?.map(c => ({
          ...c,
          x: c[fieldForMode(xMode)],
          y: c[`${fieldForMode(xMode)}Percentile`],
        }))
        ?.filter(c => !isNaN(Number(c.x)) && !isNaN(Number(c.y))) || []
    );
  }, [data, xMode, yMode, mainMode]);

  const percentiles = useMemo(
    () => eloClasses.map(c => closestYForX(c, curModeData)),
    [curModeData],
  );

  const curModeDataPoints = useMemo(() => curModeData.map(c => c.x), [curModeData]);

  const weibull = useAsyncWeibull(curModeDataPoints);
  const { k, lambda } = weibull;

  if (loading) {
    return <ProgressSpinner />;
  }

  if (!curModeData.length) {
    return null;
  }

  const graph = (
    <Scatter
      options={{
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
              label: ({ raw }) => {
                const { memberNumber, name, rating, y, pointsGraphName } =
                  raw as RawDataPoint;
                if (pointsGraphName) {
                  return undefined;
                }
                return `${memberNumber} ${name}; Top ${y.toFixed(2)}%, ELO: ${rating.toFixed(2)}`;
              },
            },
          },
          annotation: {
            annotations: {
              ...Object.assign(
                {},
                ...percentiles.map((perc, i) =>
                  yLine(
                    `Top ${perc?.toFixed(2)}% = ${["GM", "M", "A", "B", "C"][i]}`,
                    perc,
                    annotationColor(0.75),
                  ),
                ),
              ),
              ...Object.assign(
                {},
                ...eloClasses.map(eloRating =>
                  xLine(String(eloRating), eloRating, r5annotationColor(0.5), 2.5),
                ),
              ),
            },
          },
        },
      }}
      data={{
        datasets: [
          {
            label: "Weibull",
            data: pointsGraph({
              yFn: weibulCDFFactory(k, lambda),
              minX: 0,
              maxX: 1.05 * curModeData[0].x,
              step: 0.1,
              name: "Weibull",
            }),
            pointRadius: 1,
            pointBorderColor: "black",
            pointBorderWidth: 0,
            pointBackgroundColor: wbl1AnnotationColor(0.66),
          },
          {
            label: "ELO / Percentile",
            data: curModeData,
            pointBorderColor: "white",
            pointBorderWidth: 0,
            backgroundColor: "#ae9ef1",
            pointBackgroundColor: data?.map(c => bgColorForClass[classForELO(c.rating)]),
          },
        ],
      }}
    />
  );

  return (
    <div>
      <div className="flex mt-4 justify-content-around text-base lg:text-xl">
        <WeibullStatus weibull={weibull} />
      </div>
      <div
        style={{
          maxWidth: "100%",
          height: "calc(100vh - 420px)",
          minHeight: "calc(max(60vh, 60vw))",
        }}
      >
        {graph}
      </div>
    </div>
  );
};

export default ShootersELODistributionChart;
