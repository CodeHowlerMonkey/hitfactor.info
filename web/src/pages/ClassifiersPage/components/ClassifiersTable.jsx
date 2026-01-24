import cx from "classnames";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useMemo, useEffect, useState } from "react";

import { reloadMattersL10 } from "@shared/constants/classifiers";
import terrenceHHFs from "@shared/constants/terrenceHHF";
import { correlation } from "@shared/utils/weibull";
import { Scatter, pointsGraph } from "@web/components/chart/common";
import { useApi } from "@web/utils/client";

import { deprecatedUSPSAClassifiers } from "../../../../../api/src/dataUtil/classifiersData";
import {
  classifierCodeSort,
  dateSort,
  numSort,
  stringSort,
} from "../../../../../shared/utils/sort";
import { weibulCDFFactory } from "../../../../../shared/utils/weibull";
import ClassifierCell from "../../../components/ClassifierCell";
import {
  iconForDifficulty,
  letterRatingForPercent,
  renderPercent,
} from "../../../components/Table";
import useTableSort from "../../../components/Table/useTableSort";

//isSCSA ? 2 : 4
//isSCSA ? 's' : 0
const numFieldsDiff =
  (b, a, precision = 4, suffix = "", aAndBMustBePositive = false) =>
  c => {
    const { [a]: ca, [b]: cb } = c;
    if (!ca || !cb) {
      return "—";
    }
    if (aAndBMustBePositive && (ca < 0 || cb < 0)) {
      return "—";
    }
    const sign = ca > cb ? "" : "+";
    const diff = cb - ca;
    const diffPercent = 100 * (cb / ca - 1);

    const hfDifference = `${sign} ${diff.toFixed(precision)}${suffix}`;
    const percentDifference = `${sign} ${diffPercent.toFixed(2)}`;

    return (
      <div>
        <div>{hfDifference}</div>
        <div style={{ fontSize: "0.8em" }}>({percentDifference}%)</div>
      </div>
    );
  };

export const doubleFieldDiff =
  (b, a, precision = 4, suffix = "", boldFn = () => false) =>
  c => {
    const { [a]: ca, [b]: cb } = c;
    if (!ca || !cb) {
      return "—";
    }
    const sign = ca > cb ? "" : "+";
    const diff = cb - ca;
    const diffPercent = 100 * (cb / ca - 1);

    const hfDifference = `${sign} ${diff.toFixed(precision)}${suffix}`;
    const percentDifference = `${sign} ${diffPercent.toFixed(2)}`;

    const boldStyle = boldFn(c)
      ? { fontWeight: "bold", WebkitTextStroke: "crimson", WebkitTextStrokeWidth: 0.5 }
      : {};

    return (
      <div className="flex flex-column" style={boldStyle}>
        {/*<div className="text-lg">{c[a].toFixed(precision)}</div>*/}
        <div className="text-sm">
          <div>{hfDifference}</div>
          <div>({percentDifference}%)</div>
        </div>
      </div>
    );
  };

const ClassifiersTable = ({ division, onClassifierSelection }) => {
  const isSCSA = division.startsWith("scsa");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { resetSort, ...sortProps } = useTableSort({
    initial: { field: "code", order: 1 },
  });
  const [filter, setFilter] = useState("");
  const [nerdMode, setNerdMode] = useState(false);
  const [schizoMode, setSchizoMode] = useState(false);
  const [prod1015Mode, setProd1015Mode] = useState(false);
  const [locoMode, setLOCOMode] = useState(false);
  const sortState = sortProps;

  useEffect(() => {
    setProd1015Mode(false);
    setLOCOMode(false);
    setSchizoMode(false);
  }, [division]);

  const { json: dataRaw, loading } = useApi(`/classifiers/${division ?? ""}`);
  const data = (dataRaw ?? [])
    .map(d => ({
      ...d,
      updated: new Date(d.updated).toLocaleDateString("en-us", { timeZone: "UTC" }),
      recHHFChange: d.curHHF - d.recHHF,
      recHHFChangePercent: 100 * (d.curHHF / d.recHHF - 1),
      oldHHFChange: d.oldHHF - d.recHHF,
      oldHHFChangePercent: 100 * (d.oldHHF / d.recHHF - 1),
      terrenceHHF: terrenceHHFs[d.code],
      terrenceHHFSchizoDiff: d.schizoHHF - terrenceHHFs[d.code],
      terrenceHHFSchizoDiffPercent: 100 * (d.schizoHHF / terrenceHHFs[d.code] - 1),
      lambdaNormalized: (100 * d.lambda) / d.recHHF,
      // for alignment to trickless recHHF (obtained without modifying other division data / cherry-picking / splits analysis / etc)
      // lambdaNormalized: (100 * d.lambda) / (weibulReverseCDFFactory(d.k, d.lambda)(3) / 0.9),
      difficulty: 200 - (200 * d.lambda) / d.recHHF,
    }))
    .sort((a, b) => {
      switch (sortState.sortField) {
        case "code":
          return classifierCodeSort(a, b, sortState.sortField, sortState.sortOrder);

        case "updated":
          return dateSort(a, b, sortState.sortField, sortState.sortOrder);

        default:
          if (typeof a[sortState.sortField] === "string") {
            return stringSort(a, b, sortState.sortField, sortState.sortOrder);
          }
          return numSort(a, b, sortState.sortField, sortState.sortOrder);
      }
    })
    .filter(cur => {
      if (!filter) {
        return true;
      }

      return `${cur.code}###${cur.name}`.toLowerCase().includes(filter.toLowerCase());
    });
  const [mode, setMode] = useState("Table");

  const table = (
    <DataTable
      size="small"
      className={cx("text-xs md:text-base")}
      style={
        mode === "Table"
          ? { maxWidth: "100%", width: "fit-content", margin: "auto" }
          : { width: "100%" }
      }
      tableStyle={mode !== "Table" && { display: "none" }}
      header={
        <div className="flex flex-column justify-content-center align-items-stretch gap-2 mt-2">
          <div className="flex flex-wrap align-items-end">
            <div className="flex flex-column gap-1 mb-2">
              <div>{data.length} classifiers</div>
              <div className="text-xs flex gap-2 align-items-center">
                Nerd Mode
                <Checkbox onChange={e => setNerdMode(e.checked)} checked={nerdMode} />
                {division === "prod" && (
                  <>
                    <div className="ml-8" />
                    Prod 10 vs 15
                    <Checkbox
                      onChange={e => setProd1015Mode(e.checked)}
                      checked={prod1015Mode}
                    />
                  </>
                )}
                {division === "lo" && (
                  <>
                    <div className="ml-8" />
                    LO vs CO
                    <Checkbox onChange={e => setLOCOMode(e.checked)} checked={locoMode} />
                  </>
                )}
                {division === "l10_DISABLED" && (
                  <>
                    <div className="ml-8" />
                    Schizo Mode
                    <Checkbox
                      onChange={e => setSchizoMode(e.checked)}
                      checked={schizoMode}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="flex-grow-1" />
            {nerdMode && (
              <>
                <SelectButton
                  className="compact text-xs mb-2"
                  allowEmpty={false}
                  options={["Table", "Weibulls", "Params"]}
                  value={mode}
                  onChange={e => setMode(e.value)}
                />
                <div className="flex-grow-1" />
              </>
            )}
            {mode === "Table" && (
              <span className="w-12 md:w-16rem p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                  className="w-12"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Search"
                />
              </span>
            )}
          </div>
        </div>
      }
      loading={loading}
      showGridlines
      rowClassName={rowData =>
        cx({ "opacity-30": deprecatedUSPSAClassifiers.includes(rowData.code) })
      }
      selectionMode="single"
      selection={null}
      onSelectionChange={({ value }) => onClassifierSelection(value.code)}
      stripedRows
      lazy
      value={mode === "Table" ? (data ?? []) : []}
      removableSort
      {...sortProps}
    >
      <Column
        hidden={mode !== "Table"}
        style={{ width: "5.5em" }}
        field="code"
        header="Classifier"
        sortable
        body={c => <ClassifierCell info={c} showScoring />}
      />
      <Column
        hidden={mode !== "Table"}
        field="difficulty"
        header="Difficulty"
        sortable
        body={(c, { field }) => (
          <div className="flex gap-2 justify-content-center text-xs">
            <div className="flex align-items-center gap-1">
              <div style={{ fontSize: "2.25em", textAlign: "center" }}>
                {iconForDifficulty(c[field])}
              </div>
            </div>
          </div>
        )}
      />
      <Column
        hidden={mode !== "Table"}
        field="ccQuality"
        header="Quality"
        headerTooltip="Quality Rating, using correlations against majors classification, overall classification, and the distribution shape."
        sortable
        style={{ width: "9em", minWidth: "9em", maxWidth: "9em" }}
        body={(c, { field }) => (
          <div className="flex gap-2 text-sm">
            <div className="flex flex-column">
              <div style={{ fontSize: "1.5em", textAlign: "center" }}>
                {letterRatingForPercent(c[field])}
              </div>
              <div>{renderPercent(c, { field })}</div>
            </div>
            <div
              style={{ fontSize: "0.65em" }}
              className="flex flex-column justify-content-between"
            >
              <div>G {c.inverse95RecPercentPercentile}%</div>
              <div>M {c.inverse85RecPercentPercentile}%</div>
              <div>A {c.inverse75RecPercentPercentile}%</div>
            </div>
          </div>
        )}
      />
      <Column
        hidden={mode !== "Table"}
        field="allDivQuality"
        header="OA Qual."
        headerTooltip="Average of Quality Rating between Open, Limited, Carry Optics and PCC divisions"
        sortable
        style={{ maxWidth: "7em" }}
        body={(c, { field }) => (
          <div className="flex gap-2 justify-content-center text-xs">
            <div className="flex flex-column">
              <div style={{ fontSize: "1.5em", textAlign: "center" }}>
                {letterRatingForPercent(c[field])}
              </div>
              <div>{renderPercent(c, { field })}</div>
            </div>
          </div>
        )}
      />
      <Column
        hidden={mode !== "Table"}
        field="runs"
        header="Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="lastYearRuns"
        header="Last Year Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
        body={c => c.lastYearRuns || "N/A"}
      />
      <Column
        hidden={!prod1015Mode || mode !== "Table"}
        field="prod10Runs"
        header="Prod.10 Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        hidden={!prod1015Mode || mode !== "Table"}
        field="prod15Runs"
        header="Prod.15 Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="eloRuns"
        header="ELO Scores"
        headerTooltip="Scores by shooters that have ELO rating"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="majorsRuns"
        header="Majors Scores"
        headerTooltip="Scores by shooters that have Majors Classification"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
        body={c => c.majorsRuns || "N/A"}
      />
      <Column
        hidden={mode !== "Table"}
        field="recHHF"
        header={division === "l10" ? "Rec. HHF (Prophecy)" : "Rec. HHF"}
        sortable
        style={{ width: "8em", textAlign: "right" }}
        body={c => {
          const displayHHF = c.recHHF.toFixed(4);
          if (division !== "l10") {
            return displayHHF;
          }

          const source =
            c.recHHF === c.locoMajorHHF
              ? "LOCO Major"
              : c.recHHF === c.prod10MajorHHF
                ? "Prod10 Major"
                : c.recHHF === c.opnHHF
                  ? "Open"
                  : c.recHHF === terrenceHHFs[c.code]
                    ? "Terrence"
                    : "SS";
          return (
            <div>
              <div>{displayHHF}</div>
              <div className="text-xs text-400">({source})</div>
            </div>
          );
        }}
      />
      <Column
        hidden
        //hidden={division !== "l10"}
        field="reloadMatters"
        header="Reload Matters"
        sortable
        style={{ width: "32px" }}
        bodyStyle={{ textAlign: "center" }}
        headerClassName="text-xs"
        body={c => (reloadMattersL10(c.code) ? "✔︎" : " ")}
      />
      <Column
        hidden
        field="hhf3"
        header="Weibull HHF"
        sortable
        style={{ width: "8em", textAlign: "right" }}
        body={c => c.wbl3HHF.toFixed(4)}
      />
      <Column
        hidden
        field="prophecyHHF"
        header="Prophecy HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (
          <span
            className={c.prophecyHHF < c.opnHHF ? "text-green-400" : "text-yellow-400"}
          >
            {c.prophecyHHF ? c.prophecyHHF.toFixed(4) : "—"}
          </span>
        )}
      />
      <Column
        hidden
        field="locoMajorHHF"
        header="LOCO Maj HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => c.locoMajorHHF?.toFixed(4)}
      />
      <Column
        hidden
        field="ltdHHF"
        header="LTD HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => c.ltdHHF.toFixed(4)}
      />
      <Column
        hidden
        field="prod10HHF"
        header="P10 HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.prod10HHF ? c.prod10HHF.toFixed(4) : "—")}
      />
      <Column
        hidden
        field="prod10MajorHHF"
        header="P10Maj HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (
          <span
            className={
              c.prod10MajorHHF <= c.opnHHF ? "text-green-400" : "text-yellow-400"
            }
          >
            {c.prod10MajorHHF ? c.prod10MajorHHF.toFixed(4) : "—"}
          </span>
        )}
      />
      <Column
        hidden
        field="schizoHHF"
        header="Schizo HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (
          <span
            className={
              c.schizoHHF > c.prod10HHF &&
              c.schizoHHF >= c.ltdHHF &&
              c.schizoHHF <= c.opnHHF
                ? "text-green-400"
                : "text-yellow-400"
            }
          >
            {c.schizoHHF ? c.schizoHHF.toFixed(4) : "—"}
          </span>
        )}
      />
      <Column
        hidden
        field="terrenceHHF"
        header="Terrence HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (
          <span
            className={
              terrenceHHFs[c.code] > c.prod10HHF &&
              terrenceHHFs[c.code] >= c.ltdHHF &&
              terrenceHHFs[c.code] <= c.opnHHF
                ? "text-green-400"
                : "text-yellow-400"
            }
          >
            {terrenceHHFs[c.code].toFixed(4)}
          </span>
        )}
      />
      <Column
        hidden
        field="terrenceHHFSchizoDiffPercent"
        header="Schizo Diff"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={numFieldsDiff("schizoHHF", "terrenceHHF", 4, " HF")}
      />
      <Column
        hidden={!prod1015Mode || mode !== "Table"}
        field="prod10HHF"
        header="Prod10 RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.prod10HHF ? c.prod10HHF.toFixed(4) : "—")}
      />
      <Column
        hidden={!prod1015Mode || mode !== "Table"}
        field="prod15HHF"
        header="Prod15 RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.prod15HHF ? c.prod15HHF.toFixed(4) : "—")}
      />
      <Column
        hidden={!locoMode || mode !== "Table"}
        field="loHHF"
        header="LO RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.loHHF ? c.loHHF.toFixed(4) : "—")}
      />
      <Column
        hidden={!locoMode || mode !== "Table"}
        field="coHHF"
        header="CO RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.coHHF ? c.coHHF.toFixed(4) : "—")}
      />
      <Column
        hidden={mode !== "Table"}
        field="curHHF"
        header={isSCSA ? "HQ Peak Time" : "HQ HHF"}
        sortable
        style={{ width: "100px" }}
        align="right"
        body={c => {
          if (c.curHHF <= 0) {
            return (
              <span
                style={{ display: "inline-block", width: "100%", textAlign: "center" }}
              >
                —
              </span>
            );
          }

          return c.curHHF.toFixed(4);
        }}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="recHHFChangePercent" /** field is Percent for sorting, still shows like PeakTime/HHF */
        header="Rec. minus HQ"
        sortable
        body={numFieldsDiff("recHHF", "curHHF", 4, " HF", true)}
      />
      <Column
        hidden={mode !== "Table"}
        field="oldHHF"
        header="Old HHF"
        headerTooltip="HQ HHF before March 2025 Update"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => {
          if (c.oldHHF <= 0) {
            return (
              <span
                style={{ display: "inline-block", width: "100%", textAlign: "center" }}
              >
                —
              </span>
            );
          }

          return c.oldHHF.toFixed(4);
        }}
      />
      <Column
        hidden
        field="oldHHFChangePercent" /** field is Percent for sorting, still shows like PeakTime/HHF */
        header="Rec. minus Old HQ"
        sortable
        body={numFieldsDiff("recHHF", "oldHHF", isSCSA ? 2 : 4, isSCSA ? "s" : " HF")}
      />
      <Column
        hidden={division !== "l10" || mode !== "Table"}
        field="opnHHF"
        header="Open Rec. HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => c.opnHHF.toFixed(4)}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="meanSquaredError"
        header="MSE"
        headerTooltip="Mean Squared Error against Fitted Weibull"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field].toFixed(4)}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="superMeanSquaredError"
        header="SMSE"
        headerTooltip="Mean Squared Error against k=3.6 Weibull"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field].toFixed(4)}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="eloCorrelation"
        header="rELO"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field]?.toFixed(4) || "?"}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="majorsCorrelation"
        header="rMajors"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field]?.toFixed(4) || "?"}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="classificationCorrelation"
        header="rClass"
        headerTooltip="Classification Percentage Correlation"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field]?.toFixed(4) || "?"}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="k"
        header="K"
        sortable
        body={(c, { field }) => c[field].toFixed(2)}
      />
      <Column
        hidden={!nerdMode || mode !== "Table"}
        field="lambdaNormalized"
        header="Lambda"
        sortable
        body={c => `${c.lambdaNormalized.toFixed(2)}%`}
      />
    </DataTable>
  );

  return (
    <div>
      {table}
      {mode !== "Table" && <ClassifiersChart data={data} loading={loading} mode={mode} />}
    </div>
  );
};

const fieldModeMap = {
  K: "k",
  Lambda: "lambdaNormalized",
  rMajors: "majorsCorrelation",
  rClass: "classificationCorrelation",
  HHF: "recHHF",
  Quality: "ccQuality",
  SMSE: "superMeanSquaredError",
  SMAE: "superMeanAbsoluteError",
  MSE: "meanSquaredError",
  MAE: "meanAbsoluteError",
  ME: "maxError",
  Runs: "runs",
};
const fieldForMode = mode => fieldModeMap[mode];
const modes = Object.keys(fieldModeMap);
const recommendedMode = modes[0];

const useParamsChart = data => {
  const [xMode, setXMode] = useState(recommendedMode);
  const [yMode, setYMode] = useState(recommendedMode);

  const curModeData = useMemo(() => {
    if (!data) {
      return [];
    }

    return (
      data
        ?.map(c => ({
          ...c,
          x: c[fieldForMode(xMode)],
          y: c[fieldForMode(yMode)],
        }))
        ?.filter(c => c.y > 0 && c.x > 0) || []
    );
  }, [data, xMode, yMode]);

  const correl = useMemo(
    () =>
      !curModeData?.length
        ? 0
        : correlation(
            curModeData.map(c => c.x),
            curModeData.map(c => c.y),
          ),
    [curModeData],
  );

  const curModeDataset = useMemo(
    () => ({
      label: "Params",
      data: curModeData,
      pointBorderColor: "white",
      pointBorderWidth: 0,
      backgroundColor: "#ae9ef1",
      pointBackgroundColor: curModeData.map(
        c => `rgba(${red(c.ccQuality)}, ${green(c.ccQuality)}, 0, 1)`,
      ),
    }),
    [curModeData],
  );

  return useMemo(
    () => ({
      correl,
      datasets: [
        curModeDataset,
        xMode === "Lambda" && yMode === "K"
          ? {
              label: "K/Lambda Quadratic",
              data: pointsGraph({
                yFn: lambda => 0.004386 * lambda ** 2 - 0.3935 * lambda + 10.9112,
                minX: 45,
                maxX: 70,
                step: 0.1,
                name: "K/Lambda",
              }),
              pointRadius: 1,
              pointBorderColor: "black",
              pointBorderWidth: 0,
              pointBackgroundColor: "rgba(254, 28, 239, 0.5)",
            }
          : {},
      ],
      xMode,
      setXMode,
      yMode,
      setYMode,
    }),
    [correl, curModeDataset, xMode, yMode],
  );
};

const red = quality => {
  const normalized = Math.max(0, Math.min(1, quality / 100));
  return Math.ceil(255 * Math.pow(1 - normalized, 3.2));
};
const green = quality => {
  const normalized = Math.max(0, Math.min(1, quality / 100));
  return Math.ceil(255 * Math.pow(normalized, 3.2));
};

const weibullDataSetFactory = ds => ({
  label: `${ds.code} ${ds.name} ${ds.ccQuality.toFixed(2)}%`,
  data: pointsGraph({
    yFn: weibulCDFFactory(ds.k, ds.lambdaNormalized),
    minX: 0,
    maxX: 120,
    name: ds.code,
    step: 0.1,
  }),
  pointRadius: 2,
  pointBorderColor: "black",
  pointBorderWidth: 0,
  pointBackgroundColor: `rgba(${red(ds.ccQuality)}, ${green(ds.ccQuality)}, 0, 1)`,
});

const useWeibullsChart = data =>
  useMemo(() => ({ datasets: data.map(weibullDataSetFactory) }), [data]);

export const ClassifiersChart = ({ data, loading, mode }) => {
  const params = useParamsChart(mode === "Params" ? data : []);
  const weibulls = useWeibullsChart(mode === "Weibulls" ? data : []);

  if (loading) {
    return <ProgressSpinner />;
  }

  const graph = (
    <Scatter
      options={{
        maintainAspectRatio: false,
        scales: {
          y: {
            reverse: mode === "Weibulls",
            min: "auto",
            max: "auto",
          },
          x: { max: "auto", min: "auto" },
        },
        elements: {
          point: {
            radius: 3,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
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
            ...(mode === "Weibulls"
              ? {
                  mode: "dataset",
                  position: "nearest",
                }
              : {}),
            callbacks: {
              label: ({ raw }) => {
                if (mode === "Weibulls") {
                  return null;
                }

                const { code } = raw;
                return code;
              },
            },
          },
          annotation: {
            annotations: {},
          },
        },
      }}
      data={{
        datasets: [...params.datasets, ...weibulls.datasets].filter(Boolean),
      }}
    />
  );

  return (
    <div>
      {mode !== "Params" ? null : (
        <div className="flex mt-1 justify-content-around text-base lg:text-xl">
          <div className="flex flex-column gap-2">
            <div className="flex flex-column justify-content-center align-items-start">
              <span className="text-md text-500 font-bold">Position X</span>
              <SelectButton
                className="compact text-xs"
                allowEmpty={false}
                options={modes}
                value={params.xMode}
                onChange={e => params.setXMode(e.value)}
              />
            </div>
            <div className="flex flex-column justify-content-center align-items-start">
              <span className="text-md text-500 font-bold">Position Y</span>
              <SelectButton
                className="compact text-xs"
                allowEmpty={false}
                options={modes}
                value={params.yMode}
                onChange={e => params.setYMode(e.value)}
              />
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex flex-column justify-content-center text-md text-500 font-bold">
              <div>Correlation = {params.correl.toFixed(6)}</div>
            </div>
          </div>
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: mode === "Params" ? "calc(100vh - 320px)" : "calc(100vh - 240px)",
        }}
      >
        {data?.length > 0 && graph}
      </div>
    </div>
  );
};

export default ClassifiersTable;
