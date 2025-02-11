import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useMemo, useState } from "react";

import features from "../../../../shared/features";
import { classForPercent } from "../../../../shared/utils/classification";
import { weibulCDFFactory } from "../../../../shared/utils/weibull";
import { useApi } from "../../utils/client";
import { bgColorForClass } from "../../utils/color";
import { useIsHFU } from "../../utils/useIsHFU";

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

const forcedWeibulls = {
  opn: { k: 3.8955, lambda: 59.9168 },
  ltd: { k: 3.4832, lambda: 55.7686 },
  l10: { k: 3.4424, lambda: 57.4401 },
  prod: { k: 3.4573, lambda: 55.1384 },
  rev: { k: 3.4498, lambda: 57.631 },
  ss: { k: 3.4634, lambda: 56.8793 },
  co: { k: 3.9447, lambda: 60.7257 },
  pcc: { k: 4.2067, lambda: 61.8335 },
  lo: { k: 4.381, lambda: 63.4105 },
};

const fieldModeMap = {
  //HQ: "curPercent",
  HQ: "curHHFPercent",
  "HQ High": "curHHFPercentHigh",
  /*
  "Rec.HHFOnly": "recHHFOnlyPercent",
  "Rec.Soft": "recSoftPercent",
  "Rec.Brutal": "recPercent",
  */
  Recommended: "recPercentUncapped",
  "Recommended High": "recPercentUncappedHigh",
};
const fieldForMode = mode => fieldModeMap[mode];
const modes = Object.keys(fieldModeMap);
const recommendedMode = modes[2];

export const ShootersDistributionChart = ({ division, style }) => {
  const isHFU = useIsHFU(division);
  const [colorModeState, setColorMode] = useState(recommendedMode);
  const [xModeState, setXMode] = useState(recommendedMode);

  // only use recommended in HFU
  const colorMode = isHFU ? recommendedMode : colorModeState;
  const xMode = isHFU ? recommendedMode : xModeState;

  const { json: data, loading } = useApi(`/shooters/${division}/chart`);

  const forcedWeibull = features.major ? forcedWeibulls[division] : null;
  const curModeData = useMemo(
    () =>
      data?.map(c => ({
        ...c,
        x: c[fieldForMode(xMode)],
        y: forcedWeibull
          ? weibulCDFFactory(
              forcedWeibull.k,
              forcedWeibull.lambda,
            )(c[fieldForMode(xMode)])
          : c[`${fieldForMode(xMode)}Percentile`],
      })) || [],
    [data, xMode, forcedWeibull],
  );

  const percentiles = useMemo(() => {
    const sprPercentile = closestYForX(95, curModeData);
    const gmPercentile = closestYForX(90, curModeData, -sprPercentile[1]);
    const mPercentile = closestYForX(
      80,
      curModeData,
      -gmPercentile[1] - sprPercentile[1],
    );
    const aPercentile = closestYForX(
      70,
      curModeData,
      -mPercentile[1] - gmPercentile[1] - sprPercentile[1],
    );
    const bPercentile = closestYForX(
      60,
      curModeData,
      -aPercentile[1] - mPercentile[1] - gmPercentile[1] - sprPercentile[1],
    );
    const cPercentile = closestYForX(
      40,
      curModeData,
      -bPercentile[1] -
        aPercentile[1] -
        mPercentile[1] -
        gmPercentile[1] -
        sprPercentile[1],
    );

    const dPercentile = [
      100,
      curModeData.length -
        cPercentile[1] -
        bPercentile[1] -
        aPercentile[1] -
        mPercentile[1] -
        gmPercentile[1] -
        sprPercentile[1],
    ];

    return [
      sprPercentile,
      gmPercentile,
      mPercentile,
      aPercentile,
      bPercentile,
      cPercentile,
      dPercentile,
    ];
  }, [curModeData]);

  const curModeDataPoints = useMemo(() => curModeData.map(c => c.x), [curModeData]);

  const weibull = useAsyncWeibull(curModeDataPoints);
  const { k: realK, lambda: realLambda } = weibull;
  const k = forcedWeibull?.k ?? realK;
  const lambda = forcedWeibull?.lambda ?? realLambda;

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
              label: ({
                raw: { recPercent, curHHFPercent, memberNumber, y, pointsGraphName },
              }) => {
                if (pointsGraphName) {
                  return null;
                }
                return `${memberNumber}; Top ${y.toFixed(
                  2,
                )}%, Rec: ${recPercent}%, HQ/curHHF: ${curHHFPercent}%`;
              },
            },
          },
          annotation: {
            annotations: {
              // TODO: [local experiment only] uncap hundo and reclassify all CO
              // shooters to see how it affects percentiles.
              //
              // Intuition: currently M is around target, A,B,C are easier than 85th/60th/20th
              // and GM is harder than 99th, possibly due to "compression" of GM classifier
              // scores on the upper end. By removing the hundo-cap we should increase classification of
              // people, who have >100% runs, which should be relatively small, but increases number of GMs
              ...Object.assign(
                {},
                ...percentiles.map((perc, i) =>
                  perc[0] < 0
                    ? {}
                    : yLine(
                        `Top ${perc[0]?.toFixed(2)}% (${perc[1]}) = ${["SPR", "GM", "M", "A", "B", "C", "D"][i]}`,
                        perc[0],
                        annotationColor(0.75),
                      ),
                ),
              ),
              ...xLine("95%", 95, r5annotationColor(0.5), 2.5),
              ...xLine("90%", 90, r5annotationColor(0.5), 2.5),
              ...xLine("80%", 80, r5annotationColor(0.5), 2.5),
              ...xLine("70%", 70, r5annotationColor(0.5), 2.5),
              ...xLine("60%", 60, r5annotationColor(0.5), 2.5),
              ...xLine("40%", 40, r5annotationColor(0.5), 2.5),
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
              maxX: 100,
              step: 0.1,
              name: "Weibull",
            }),
            pointRadius: 1,
            pointBorderColor: "black",
            pointBorderWidth: 0,
            pointBackgroundColor: wbl1AnnotationColor(0.66),
          },
          {
            label: "Classification / Percentile",
            data: curModeData,
            pointBorderColor: "white",
            pointBorderWidth: 0,
            backgroundColor: "#ae9ef1",
            pointBackgroundColor: curModeData?.map(
              c =>
                bgColorForClass[
                  classForPercent(c[fieldForMode(colorMode)], features.major)
                ],
            ),
          },
        ],
      }}
    />
  );

  return (
    <div style={style}>
      <div className="flex mt-4 justify-content-start gap-4 mb-2 text-base lg:text-xl">
        {!isHFU && (
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
              <span className="text-md text-500 font-bold">Position</span>
              <SelectButton
                className="compact text-xs"
                allowEmpty={false}
                options={modes}
                value={xMode}
                onChange={e => setXMode(e.value)}
              />
            </div>
          </div>
        )}
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

export default ShootersDistributionChart;
