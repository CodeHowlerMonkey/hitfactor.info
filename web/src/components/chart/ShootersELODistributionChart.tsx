import { Dropdown } from "primereact/dropdown";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useMemo, useState } from "react";

import {
  classForELO,
  classForPercent,
  eloRatings,
} from "@shared/classification/brackets";

import {
  annotationColor,
  r5annotationColor,
  xLine,
  yLine,
  Scatter,
  pointsGraph,
  closestYForX,
  linearAnnotationColor,
} from "./common";
import { ageModeParam, ageModes, eloModes, fieldForMode } from "./fields";

import { eloPointForShooter } from "../../../../api/src/dataUtil/elo";
import {
  covariance,
  correlation,
  linearRegression,
  linearFactory,
} from "../../../../shared/utils/weibull";
import { useApi } from "../../utils/client";
import { bgColorForClass } from "../../utils/color";

const mainModeMap = {
  "ELO Only": "elo",
  Versus: "vs",
};
const mainModeFieldForMode = mode => mainModeMap[mode];
const mainModes = Object.keys(mainModeMap);
const defaultMainMode = mainModes[0];

const recommendedMode = eloModes[0];
const percentModes = eloModes.filter(c => c !== "ELO");

interface RawDataPoint {
  x: number;
  y: number;
  pointsGraphName: string;
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
  selectedMemberNumber?: string;
}

export const ShootersELODistributionChart = ({
  division,
  selectedMemberNumber,
}: ShootersELODistributionChartProps) => {
  const [mainMode, setMainMode] = useState(defaultMainMode);
  const isVersus = mainModeFieldForMode(mainMode) === "vs";
  const [colorMode, setColorMode] = useState(recommendedMode);
  const [xMode, setXMode] = useState(recommendedMode);
  const [yMode, setYMode] = useState(recommendedMode);
  const [ageMode, setAgeMode] = useState(ageModes[0]);
  const endpoint = `/shooters/${division}/chart?mode=elo${ageModeParam(ageMode)}`;
  const { json: data, loading } = useApi(endpoint);
  const curModeData = useMemo(() => {
    if (!data) {
      return [];
    }
    const dataWithElo = data
      .map(c => {
        const eloPoint = eloPointForShooter(division, c.memberNumber);
        if (!eloPoint) {
          return null;
        }
        return {
          ...c,
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
        ?.filter(c => c.y > 0 && c.x > 0) || []
    );
  }, [division, data, xMode, yMode, isVersus]);

  const percentiles = useMemo(
    () =>
      eloRatings
        .toReversed()
        .map(c => closestYForX(c, curModeData)[0])
        .filter(c => c >= 0),
    [curModeData],
  );

  const correl = useMemo(
    () =>
      !isVersus || !curModeData?.length
        ? 0
        : correlation(
            curModeData.map(c => c.x),
            curModeData.map(c => c.y),
          ),
    [isVersus, curModeData],
  );
  const covar = useMemo(
    () =>
      !isVersus || !curModeData?.length
        ? 0
        : covariance(
            curModeData.map(c => c.x),
            curModeData.map(c => c.y),
          ),
    [isVersus, curModeData],
  );
  const lrr = useMemo(
    () =>
      !isVersus || !curModeData?.length
        ? { slope: 0, intercept: 0 }
        : linearRegression(curModeData.filter(c => c.x >= 60)),
    [isVersus, curModeData],
  );

  if (loading) {
    return <ProgressSpinner />;
  }

  if (!curModeData.length) {
    return null;
  }

  const selectedShooterDataPoint = !selectedMemberNumber
    ? undefined
    : curModeData.find(c => c.memberNumber === selectedMemberNumber);

  const graph = (
    <Scatter
      options={{
        maintainAspectRatio: false,
        scales: {
          y: {
            reverse: !isVersus,
            max: isVersus && percentModes.includes(yMode) ? 120 : undefined,
          },
          x: { max: isVersus && percentModes.includes(xMode) ? 120 : undefined },
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
              label: ({ raw }) => {
                const { memberNumber, name, rating, x, y, pointsGraphName } =
                  raw as RawDataPoint;
                if (pointsGraphName) {
                  return "";
                }
                if (isVersus) {
                  return `${memberNumber} ${name}; X ${x.toFixed(2)}; Y ${y.toFixed(2)}; ELO: ${rating?.toFixed(2) || "—"}`;
                }
                return `${memberNumber} ${name}; Top ${y.toFixed(2)}%, ELO: ${rating?.toFixed(2) || "—"} (${((100 * (rating || 0)) / 1700).toFixed(2)}%)`;
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
                    ...eloRatings
                      .toReversed()
                      .filter(c => c > 1)
                      .map(eloRating =>
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
          ...(!selectedShooterDataPoint
            ? []
            : [
                {
                  label: selectedShooterDataPoint.memberNumber,
                  data: [selectedShooterDataPoint] as RawDataPoint[],
                  pointRadius: 4,
                  pointBorderColor: "white",
                  pointBorderWidth: 2,
                  pointBackgroundColor: [
                    colorForELOOrPercent(colorMode, selectedShooterDataPoint),
                  ],
                },
              ]),
          ...(isVersus
            ? [
                {
                  label: "LinearRegression",
                  data: pointsGraph({
                    yFn: linearFactory(lrr),
                    minX: 0,
                    maxX: 1.05 * curModeData.toSorted((a, b) => b.x - a.x)[0].x,
                    step: 1.0,
                    name: "Linear Regression",
                  }),
                  pointRadius: 1,
                  pointBorderColor: "black",
                  pointBorderWidth: 0,
                  pointBackgroundColor: linearAnnotationColor(0.44),
                },
              ]
            : []),
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
      <div className="flex mt-4 text-base justify-content-between lg:text-xl flex-wrap gap-4">
        <div className="flex flex-column justify-content-start align-items-start ml-4 mr-8 gap-1">
          <span className="text-md text-500 font-bold">Mode</span>
          <SelectButton
            className="compact text-xs"
            allowEmpty={false}
            options={mainModes}
            value={mainMode}
            onChange={e => setMainMode(e.value)}
          />
        </div>
        <div className="flex flex-column justify-content-center align-items-start gap-1">
          <span className="text-md text-500 font-bold">Color</span>
          <Dropdown
            className="compact text-xs"
            options={eloModes}
            value={colorMode}
            onChange={e => setColorMode(e.value)}
          />
        </div>
        <div className="flex flex-column justify-content-center align-items-start gap-1">
          <span className="text-md text-500 font-bold">Position X</span>
          <Dropdown
            disabled={mainModeFieldForMode(mainMode) !== "vs"}
            className="compact text-xs"
            options={eloModes}
            value={xMode}
            onChange={e => setXMode(e.value)}
          />
        </div>
        <div className="flex flex-column justify-content-center align-items-start gap-1">
          <span className="text-md text-500 font-bold">Position Y</span>
          <Dropdown
            disabled={mainModeFieldForMode(mainMode) !== "vs"}
            className="compact text-xs"
            options={eloModes}
            value={yMode}
            onChange={e => setYMode(e.value)}
          />
        </div>
        <div className="flex flex-column justify-content-start align-items-start ml-4 mr-8 gap-1">
          <span className="text-md text-500 font-bold">Age</span>
          <SelectButton
            className="compact text-xs"
            allowEmpty={false}
            options={ageModes}
            value={ageMode}
            onChange={e => setAgeMode(e.value)}
          />
        </div>
      </div>
      <div
        style={{
          position: "relative",
          maxWidth: "100%",
          height: "calc(min(90vh, 100vh - 320px)",
        }}
      >
        {graph}
        {!isVersus ? null : (
          <div className="flex gap-4 text-sm absolute bottom-0 right-0 mb-6 mr-5">
            <div className="flex flex-column justify-content-center text-md text-500 font-bold">
              <div>Correlation = {correl.toFixed(6)}</div>
              <div className="hidden">Covariance = {covar.toFixed(6)}</div>
              <div>{"\u200B"}</div>
              <div>Linear Regression</div>
              <div>
                y = {lrr.slope.toFixed(4)}x + {lrr.intercept.toFixed(4)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShootersELODistributionChart;
