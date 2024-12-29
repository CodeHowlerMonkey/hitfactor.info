import { uniqBy } from "lodash";
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

const colorForELOOrPercent = (colorMode: string, dataPoint: RawDataPoint) => {
  const field = fieldForMode(colorMode);
  if (field === "elo") {
    return bgColorForClass[classForELO(dataPoint.rating as number)];
  }
  return bgColorForClass[classForPercent(dataPoint[fieldForMode(colorMode)])];
};

interface ShootersELODistributionChartProps {
  division: string;
}

const coEloByMemberNumber = coElo.reduce((acc, c, index, all) => {
  acc[c.memberNumber] = { ...c, elo: c.rating, eloRank: (100 * index) / all.length };
  return acc;
}, {});

export const ShootersELODistributionChart = ({
  division,
}: ShootersELODistributionChartProps) => {
  const [mainMode, setMainMode] = useState(defaultMainMode);
  const isVersus = mainModeFieldForMode(mainMode) === "vs";
  const [colorMode, setColorMode] = useState(recommendedMode);
  const [xMode, setXMode] = useState(recommendedMode);
  const [yMode, setYMode] = useState(recommendedMode);

  const { json: data, loading } = useApi(`/shooters/${division}/chart`);
  const curModeData = useMemo(() => {
    if (!data) {
      return [];
    }
    const dataWithElo = data
      .map(c => {
        const normalizedMemberNumber = c.memberNumber.replace(
          /^(A|TY|FY|FYF|F|TYF|CA)/gi,
          "",
        );
        const eloPoint = coEloByMemberNumber[normalizedMemberNumber];
        if (!eloPoint) {
          return null;
        }
        return {
          ...c,
          memberNumber: c.memberNumber.replace(/^(A|TY|FY|FYF|F|TYF|CA)/gi, ""),
          ...eloPoint,
        };
      })
      .filter(Boolean);
    if (!isVersus) {
      const r = dataWithElo
        .map(c => ({
          ...c,
          x: c.rating,
          y: c.eloRank,
        }))
        .sort((a, b) => a.y - b.y);

      return r;
    }

    return (
      dataWithElo
        ?.map(c => ({
          ...c,
          x: c[fieldForMode(xMode)],
          y: c[fieldForMode(yMode)],
        }))
        ?.filter(c => !isNaN(Number(c.x)) && !isNaN(Number(c.y))) || []
    );
  }, [data, xMode, yMode, isVersus]);

  const percentiles = useMemo(
    () => eloClasses.map(c => closestYForX(c, curModeData)),
    [curModeData],
  );

  const curModeDataPoints = useMemo(() => curModeData.map(c => c.x), [curModeData]);

  const weibull = useAsyncWeibull(isVersus ? [] : curModeDataPoints, 10);
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
        scales: { y: { reverse: !isVersus } },
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
                if (isVersus) {
                  return null;
                }
                const { memberNumber, name, rating, y, pointsGraphName } =
                  raw as RawDataPoint;
                if (pointsGraphName) {
                  return null;
                }
                return `${memberNumber} ${name}; Top ${y.toFixed(2)}%, ELO: ${rating.toFixed(2)} (${((100 * rating) / 1700).toFixed(2)}%)`;
              },
            },
          },
          annotation: {
            annotations: isVersus
              ? {}
              : {
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
                      xLine(
                        `${eloRating} (${((100 * eloRating) / 1700).toFixed(2)}%)`,
                        eloRating,
                        r5annotationColor(0.5),
                        2.5,
                      ),
                    ),
                  ),
                },
          },
        },
      }}
      data={{
        datasets: [
          ...(isVersus
            ? []
            : [
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
              ]),
          {
            label: isVersus ? "Comparison" : "ELO / Percentile",
            data: curModeData as RawDataPoint[],
            pointBorderColor: "white",
            pointBorderWidth: 0,
            backgroundColor: "#ae9ef1",
            pointBackgroundColor: curModeData?.map(c =>
              colorForELOOrPercent(colorMode, c),
            ),
          },
        ],
      }}
    />
  );

  return (
    <div>
      <div className="flex mt-4 justify-content-around text-base lg:text-xl">
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
        <div className="flex flex-column gap-2">
          <div className="flex flex-column justify-content-center align-items-start">
            <span className="text-md text-500 font-bold">Color</span>
            <SelectButton
              className="compact text-xs"
              allowEmpty={false}
              options={modes}
              value={colorMode}
              onChange={e => setColorMode(e.value)}
            />
          </div>
          <div className="flex flex-column justify-content-center align-items-start">
            <span className="text-md text-500 font-bold">Position X</span>
            <SelectButton
              disabled={mainModeFieldForMode(mainMode) !== "vs"}
              className="compact text-xs"
              allowEmpty={false}
              options={modes}
              value={xMode}
              onChange={e => setXMode(e.value)}
            />
          </div>
          <div className="flex flex-column justify-content-center align-items-start">
            <span className="text-md text-500 font-bold">Position Y</span>
            <SelectButton
              disabled={mainModeFieldForMode(mainMode) !== "vs"}
              className="compact text-xs"
              allowEmpty={false}
              options={modes}
              value={yMode}
              onChange={e => setYMode(e.value)}
            />
          </div>
        </div>
        {!isVersus && <WeibullStatus weibull={weibull} />}
      </div>
      <div
        style={{
          maxWidth: "100%",
          height: "calc(min(100vh, max(60vh, 60vw)))",
        }}
      >
        {graph}
      </div>
    </div>
  );
};

export default ShootersELODistributionChart;
