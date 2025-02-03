import cx from "classnames";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { useEffect, useState } from "react";

import {
  classifierCodeSort,
  dateSort,
  numSort,
  stringSort,
} from "../../../../../shared/utils/sort";
import ClassifierCell from "../../../components/ClassifierCell";
import { letterRatingForPercent, renderPercent } from "../../../components/Table";
import useTableSort from "../../../components/Table/useTableSort";
import { useApi } from "../../../utils/client";

//isSCSA ? 2 : 4
//isSCSA ? 's' : 0
const numFieldsDiff =
  (b, a, precision = 4, suffix = "") =>
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
    initial: { field: "allDivQuality", order: -1 },
  });
  const [filter, setFilter] = useState("");
  const [nerdMode, setNerdMode] = useState(false);
  const [prod1015Mode, setProd1015Mode] = useState(false);
  const [locoMode, setLOCOMode] = useState(false);
  const sortState = sortProps;

  useEffect(() => {
    setProd1015Mode(false);
    setLOCOMode(false);
  }, [division]);

  const { json: dataRaw, loading } = useApi(`/classifiers/${division ?? ""}`);
  const data = (dataRaw ?? [])
    .map(d => ({
      ...d,
      updated: new Date(d.updated).toLocaleDateString("en-us", { timeZone: "UTC" }),
      recHHFChange: d.hhf - d.recHHF,
      recHHFChangePercent: 100 * (d.hhf / d.recHHF - 1),
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

  return (
    <DataTable
      size="small"
      className="text-xs md:text-base"
      style={{ width: "fit-content", margin: "auto" }}
      loading={loading}
      showGridlines
      rowClassName={rowData => cx({ "opacity-30": rowData.allDivQuality < 59 })}
      selectionMode="single"
      selection={null}
      onSelectionChange={({ value }) => onClassifierSelection(value.code)}
      stripedRows
      header={
        <div className="flex align-items-end">
          <div className="flex flex-column gap-1">
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
            </div>
          </div>
          <div className="md:flex-grow-1" />
          <span className="w-12 md:w-16rem p-input-icon-left">
            <i className="pi pi-search" />
            <InputText
              className="w-12"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search"
            />
          </span>
        </div>
      }
      lazy
      value={data ?? []}
      removableSort
      {...sortProps}
    >
      <Column
        style={{ width: "5.5em" }}
        field="code"
        header="Classifier"
        sortable
        body={c => <ClassifierCell info={c} showScoring />}
      />
      <Column
        field="ccQuality"
        header="Quality"
        headerTooltip="New Quality for Classifier Committee, using correlations and SMSE"
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
        field="allDivQuality"
        header="OA Qual."
        headerTooltip="New All Division Quality for Classifier Committee, using correlations and SMSE"
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
        field="runs"
        header="Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        hidden={!prod1015Mode}
        field="prod10Runs"
        header="Prod.10 Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        hidden={!prod1015Mode}
        field="prod15Runs"
        header="Prod.15 Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        hidden={!nerdMode}
        field="eloRuns"
        header="ELO Scores"
        headerTooltip="Scores by shooters that have ELO rating"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        field="recHHF"
        header="Rec. HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => c.recHHF.toFixed(4)}
      />
      <Column
        hidden={!prod1015Mode}
        field="prod10HHF"
        header="Prod10 RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.prod10HHF ? c.prod10HHF.toFixed(4) : "N/A")}
      />
      <Column
        hidden={!prod1015Mode}
        field="prod15HHF"
        header="Prod15 RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.prod15HHF ? c.prod15HHF.toFixed(4) : "N/A")}
      />
      <Column
        hidden={!locoMode}
        field="loHHF"
        header="LO RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.loHHF ? c.loHHF.toFixed(4) : "N/A")}
      />
      <Column
        hidden={!locoMode}
        field="coHHF"
        header="CO RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.coHHF ? c.coHHF.toFixed(4) : "N/A")}
      />
      <Column
        field="curHHF"
        header={isSCSA ? "HQ Peak Time" : "HQ HHF"}
        sortable
        style={{ width: "100px" }}
      />
      <Column
        field="recHHFChangePercent" /** field is Percent for sorting, still shows like PeakTime/HHF */
        header="Rec. minus HQ"
        sortable
        body={numFieldsDiff("recHHF", "curHHF", isSCSA ? 2 : 4, isSCSA ? "s" : " HF")}
      />
      <Column
        hidden={!nerdMode}
        field="meanSquaredError"
        header="MSE"
        headerTooltip="Mean Squared Error against Fitted Weibull"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field].toFixed(4)}
      />
      <Column
        hidden={!nerdMode}
        field="superMeanSquaredError"
        header="SMSE"
        headerTooltip="Mean Squared Error against k=3.6 Weibull"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field].toFixed(4)}
      />
      <Column
        hidden={!nerdMode}
        field="eloCorrelation"
        header="rELO"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field]?.toFixed(4) || "?"}
      />
      <Column
        hidden={!nerdMode}
        field="classificationCorrelation"
        header="rClass"
        headerTooltip="Classification Percentage Correlation"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field]?.toFixed(4) || "?"}
      />
    </DataTable>
  );
};

export default ClassifiersTable;
