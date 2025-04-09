import { ProgressSpinner } from "primereact/progressspinner";
import { useMemo } from "react";

import { classForPercent } from "../../../../shared/utils/classification";
import {
  correlation,
  linearRegression,
  linearFactory,
  LinearRegressionResult,
  EmptyLinearRegression,
} from "../../../../shared/utils/weibull";
import { bgColorForClass } from "../../utils/color";

import { Scatter, pointsGraph, linearAnnotationColor } from "./common";

interface DataPoint {
  x: number;
  y: number;
  memberNumber: string;
  name: string;
  shooterFullName: string;
  shooterRecPercent: number;
  shooterRecPercentHistorical: number;
  shooterRecPercentHistoricalAge: number;
  matchPercent: number;
  pointsGraphName: string;
}

interface DataPointWithBump extends DataPoint {
  matchBump: number;
}

const fieldModeMap = {
  Classification: "shooterRecPercent",
  Bump: "matchBump",
};
const fieldForMode = mode => fieldModeMap[mode];
const colorForELOOrPercent = (colorMode: string, dataPoint: DataPoint) => {
  const field = fieldForMode(colorMode);
  return bgColorForClass[classForPercent(dataPoint[field])];
};

const bumpForDataPoint = (c: DataPoint, lrr: LinearRegressionResult) =>
  (c.y - lrr.intercept) / lrr.slope;

const eligibilityFilter = (c: DataPoint) =>
  c.x >= 10 &&
  c.y >= 10 &&
  Math.abs(c.y - c.x) <= 15 &&
  c.shooterRecPercentHistoricalAge <= 18 &&
  c.shooterRecPercent;

export const MatchBumpChart = ({ match, division, loading }) => {
  const data = useMemo(
    () =>
      match?.matchScores
        .filter(c => c.division === division)
        .map(
          ({
            matchPercent,
            memberNumber,
            shooter,
            shooterFullName,
            shooterRecPercent,
            shooterRecPercentHistorical,
            shooterRecPercentHistoricalAge,
          }) => ({
            name: shooterFullName ?? shooter?.name,
            memberNumber,
            x: shooterRecPercentHistorical,
            y: matchPercent,
            shooterRecPercentHistorical,
            shooterRecPercentHistoricalAge,
            shooterRecPercent,
            matchPercent,
            pointsGraphName: "Match/Classification",
          }),
        )
        .filter(c => c.x > 0 && c.y > 0),
    [match, division],
  );
  const eligibleData = useMemo(() => data?.filter(eligibilityFilter), [data]);
  const lrr = useMemo(
    () =>
      !eligibleData?.length ? EmptyLinearRegression : linearRegression(eligibleData),
    [eligibleData],
  );
  const correl = useMemo(
    () =>
      data?.length >= 2
        ? correlation(
            data.map(c => c.x),
            data.map(c => c.y),
          )
        : 0,
    [data],
  );
  const eligibleCorrel = useMemo(
    () =>
      eligibleData?.length >= 2
        ? correlation(
            eligibleData.map(c => c.x),
            eligibleData.map(c => c.y),
          )
        : 0,
    [eligibleData],
  );
  const dataWithBumps = useMemo(
    () => eligibleData?.map(c => ({ ...c, matchBump: bumpForDataPoint(c, lrr) })),
    [eligibleData, lrr],
  );

  const targetPercentile = 94;
  const [
    targetFinishPercent,
    targetClassificationPercent,
    targetBumpPercent,
    targetShootersCount,
  ] = useMemo(() => {
    if (!dataWithBumps?.length) {
      return [0, 0, 0];
    }

    const top3Index = Math.floor((dataWithBumps.length * (100 - targetPercentile)) / 100);

    const finishData = dataWithBumps.map(c => c.matchPercent);
    const classificationData = dataWithBumps.map(c => c.shooterRecPercent);
    const bumpData = dataWithBumps.map(c => c.matchBump);

    return [
      finishData.toSorted((a, b) => b - a)[top3Index],
      classificationData.toSorted((a, b) => b - a)[top3Index],
      bumpData.toSorted((a, b) => b - a)[top3Index],
      top3Index + 1,
    ];
  }, [dataWithBumps]);

  if (loading) {
    return <ProgressSpinner />;
  }

  if (!dataWithBumps.length) {
    return null;
  }

  const graph = (
    <Scatter
      options={{
        maintainAspectRatio: false,
        scales: {
          y: {
            max: 120,
          },
          x: { max: 120 },
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
                const {
                  memberNumber,
                  matchPercent,
                  shooterRecPercent,
                  matchBump,
                  name,
                  pointsGraphName,
                } = raw as DataPointWithBump;
                if (pointsGraphName === "Linear Regression") {
                  return null as unknown as string;
                }
                return `${memberNumber} - ${name} - ${matchPercent.toFixed(2)}% Match - ${shooterRecPercent?.toFixed(2)}% Classification - ${matchBump?.toFixed(2)}% Match Bump`;
              },
            },
          },
        },
      }}
      data={{
        datasets: [
          {
            label: "LinearRegression",
            data: pointsGraph({
              yFn: linearFactory(lrr),
              minX: 0,
              maxX: 1.05 * dataWithBumps.toSorted((a, b) => b.x - a.x)[0].x,
              step: 0.2,
              name: "Linear Regression",
            }),
            pointRadius: 1,
            pointBorderColor: "black",
            pointBorderWidth: 0,
            pointBackgroundColor: linearAnnotationColor(0.44),
          },
          {
            label: "Match / Classification",
            data: dataWithBumps,
            pointRadius: 3,
            pointBorderWidth: 2,
            backgroundColor: "#ae9ef1",
            pointBorderColor: dataWithBumps?.map(c =>
              colorForELOOrPercent(
                c.matchBump > c.shooterRecPercent ? "Bump" : "Classification",
                c,
              ),
            ),
            pointBackgroundColor: dataWithBumps?.map(c =>
              colorForELOOrPercent("Classification", c),
            ),
          },
        ],
      }}
    />
  );

  return (
    <div>
      <div className="flex mt-4 justify-content-around text-base lg:text-xl">
        <div className="flex gap-4 text-sm">
          <div className="flex flex-column justify-content-center text-md text-500 font-bold gap-2">
            <div className="flex gap-4">
              {targetPercentile}th finish: {targetFinishPercent.toFixed(2)}%,{" "}
              {targetPercentile}th classification:{" "}
              {targetClassificationPercent.toFixed(2)}%, {targetPercentile}th bump:{" "}
              {targetBumpPercent.toFixed(2)}%, {targetPercentile}th shooters:{" "}
              {targetShootersCount}
            </div>
            <div className="flex justify-content-center gap-4">
              <div>Correlation: {(correl * 100).toFixed(2)}%</div>
              <div>Eligible Correlation: {(eligibleCorrel * 100).toFixed(2)}%</div>
            </div>
            <div className="flex gap-4">
              Linear Regression: y = {lrr.slope.toFixed(4)}x + {lrr.intercept.toFixed(4)}
              <div />
              <div>MAE: {lrr.mae.toFixed(2)}%</div>
            </div>
          </div>
        </div>
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

export default MatchBumpChart;
