import { ProgressSpinner } from "primereact/progressspinner";
import { useMemo } from "react";

import {
  Scatter,
  pointsGraph,
  linearAnnotationColor,
  xLine,
  r1annotationColor,
  yLine,
} from "./common";

import {
  eligibilityFilter,
  grandmasterPercent,
  masterPercent,
  maxPercentDifference,
} from "../../../../data/types/MatchScore";
import { matchBumpThresholds } from "../../../../shared/constants/difficulty";
import { classForPercent } from "../../../../shared/utils/classification";
import {
  correlation,
  linearRegression,
  linearFactory,
  EmptyLinearRegression,
  reverseLinear,
} from "../../../../shared/utils/weibull";
import { bgColorForClass } from "../../utils/color";

interface DataPoint {
  x: number;
  y: number;
  memberNumber: string;
  name: string;
  shooterFullName: string;
  shooterRecPercent: number;
  shooterRecPercentHistorical: number;
  shooterRecPercentHistoricalHigh: number;
  shooterRecPercentHistoricalAge: number;
  matchPercent: number;
  pointsGraphName: string;
}

interface DataPointWithBump extends DataPoint {
  matchBump: number;
}

const fieldModeMap = {
  Classification: "shooterRecPercentHistoricalHigh",
  Bump: "matchBump",
};
const fieldForMode = mode => fieldModeMap[mode];
const colorForELOOrPercent = (colorMode: string, dataPoint: DataPoint) => {
  const field = fieldForMode(colorMode);
  return bgColorForClass[classForPercent(dataPoint[field])];
};

// TODO: f3445105-8968-4079-81e4-aa40c4b5e522:lo is not eligible in DB,
// but eligible on the chart
export const MatchBumpChart = ({ match, division, loading }) => {
  const data = useMemo(
    () =>
      (match?.matchScores || [])
        .filter(c => c.division === division)
        .map(
          ({
            matchPercent,
            shooter,
            shooterFullName,
            shooterRecPercentHistorical,
            ...etc
          }) => ({
            ...etc,
            matchPercent,
            name: shooterFullName ?? shooter?.name,
            shooterRecPercentHistorical,
            x: shooterRecPercentHistorical,
            y: matchPercent,
            pointsGraphName: "Match/Classification",
          }),
        )
        .filter(c => c.x > 0 && c.y > 0)
        .sort((a, b) => {
          if (a.y !== b.y) {
            return a.y - b.y;
          }
          return a.x - b.x;
        }),
    [match, division],
  );
  const eligibleData = useMemo(() => data?.filter(eligibilityFilter), [data]);
  const lrr = useMemo(
    () =>
      !eligibleData?.length ? EmptyLinearRegression : linearRegression(eligibleData),
    [eligibleData],
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
    () => data?.map(c => ({ ...c, matchBump: reverseLinear(c, lrr) })),
    [data, lrr],
  );

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
            min: 0,
            max: 120,
          },
          x: { min: 0, max: 120 },
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
                  shooterRecPercentHistorical,
                  shooterRecPercentHistoricalHigh,
                  shooterRecPercentHistoricalAge,
                  matchBump,
                  name,
                  pointsGraphName,
                } = raw as DataPointWithBump;
                if (pointsGraphName === "Linear Regression") {
                  return null as unknown as string;
                }
                return `${memberNumber} - ${name} - ${matchPercent.toFixed(2)}% Match - ${shooterRecPercentHistorical?.toFixed(2)}% Current - ${shooterRecPercentHistoricalHigh?.toFixed(2)}% High - ${matchBump?.toFixed(2)}% Match Bump - ${shooterRecPercentHistoricalAge.toFixed(0)}mo`;
              },
            },
          },
          annotation: {
            // @ts-expect-error chart library types are shit
            annotations: {
              ...xLine(
                `x${masterPercent}%`,
                masterPercent,
                r1annotationColor(1.0),
                10,
                true,
              ),
              ...yLine(`y${masterPercent}%`, masterPercent, r1annotationColor(1.0)),

              ...xLine(
                `x${grandmasterPercent}%`,
                grandmasterPercent,
                r1annotationColor(0.5),
                10,
                true,
              ),
              ...yLine(
                `y${grandmasterPercent}%`,
                grandmasterPercent,
                r1annotationColor(0.5),
              ),
            },
          },
        },
      }}
      data={{
        datasets: [
          {
            label: "LR-High",
            data: pointsGraph({
              yFn: linearFactory(lrr, +maxPercentDifference),
              minX: 0,
              maxX: 1.05 * dataWithBumps.toSorted((a, b) => b.x - a.x)[0].x,
              step: 0.2,
              name: "Linear Regression",
            }),
            pointRadius: 1,
            pointBorderColor: "black",
            pointBorderWidth: 0,
            pointBackgroundColor: linearAnnotationColor(0.15),
          },
          {
            label: "LR-Low",
            data: pointsGraph({
              yFn: linearFactory(lrr, -maxPercentDifference),
              minX: 0,
              maxX: 1.05 * dataWithBumps.toSorted((a, b) => b.x - a.x)[0].x,
              step: 0.2,
              name: "Linear Regression",
            }),
            pointRadius: 1,
            pointBorderColor: "black",
            pointBorderWidth: 0,
            pointBackgroundColor: linearAnnotationColor(0.15),
          },
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
                c.matchBump > c.shooterRecPercentHistoricalHigh
                  ? "Bump"
                  : "Classification",
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

  const eligibleMs = eligibleData.filter(
    c => c.x >= masterPercent && c.y >= masterPercent,
  ).length;
  const eligibleGMs = eligibleData.filter(
    c => c.x >= grandmasterPercent && c.y >= grandmasterPercent,
  ).length;
  const hasEnoughData = eligibleData.length >= matchBumpThresholds.filteredDataPoints;
  const hasMaybeEnoughData =
    eligibleData.length >= matchBumpThresholds.filteredDataPointsMaybe;
  const goodCorrelation = eligibleCorrel >= matchBumpThresholds.filteredCorrelation;

  return (
    <div>
      <div className="flex mt-4 justify-content-around text-base lg:text-xl">
        <div className="flex gap-2 text-sm">
          <div className="flex flex-column justify-content-center text-md text-500 font-bold gap-1">
            <div className="flex justify-content-center gap-2">
              <div>Eligibility: </div>
              <div className={goodCorrelation ? "text-green-600" : "text-red-600"}>
                Correlation = {(eligibleCorrel * 100).toFixed(2)}%
              </div>
              <div
                className={
                  hasEnoughData
                    ? "text-green-600"
                    : hasMaybeEnoughData
                      ? "text-yellow-600"
                      : "text-red-600"
                }
              >
                Datapoints = {eligibleData.length}
              </div>
              <div>Ms= {eligibleMs}</div>
              <div>GMs= {eligibleGMs}</div>
              <div className="hidden">
                GMs= {eligibleData.filter(c => c.x >= 90 && c.y >= 90).length}
              </div>
            </div>
            <div className="flex gap-4">
              Linear Regression: y = {lrr.slope.toFixed(4)}x + {lrr.intercept.toFixed(4)};
              Bump = Match x {(1 / lrr.slope).toFixed(2)} +{" "}
              {-(lrr.intercept / lrr.slope).toFixed(2)}
              <div />
              <div>MAE: {lrr.mae.toFixed(2)}%</div>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          maxWidth: "100%",
          height: "calc(min(80vh, max(60vh, 60vw)))",
        }}
      >
        {graph}
      </div>
    </div>
  );
};

export default MatchBumpChart;
