import { useState } from "react";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";

import { useApi } from "../../../utils/client";
import useTableSort from "../../../components/Table/useTableSort";
// import { headerTooltipOptions } from "../../../components/Table";

import { numSort, dateSort, classifierCodeSort } from "../../../../../shared/utils/sort";
import ClassifierCell from "../../../components/ClassifierCell";
import {
  renderHFOrNA,
  renderPercent,
  letterRatingForPercent,
} from "../../../components/Table";

const compactPercentColumnStyle = {
  headerStyle: { width: "64px", padding: "16px 4px", fontSize: "0.8rem" },
  bodyStyle: {
    width: "64px",
    padding: "16px 4px",
    fontSize: "0.85rem",
    textAlign: "center",
  },
};

const compactNumberColumnStyle = {
  headerStyle: { width: "100px", padding: "16px 8px", fontSize: "0.85rem" },
  bodyStyle: {
    width: "100px",
    padding: "16px 8px",
    textAlign: "right",
  },
};

const ClassifiersTable = ({ division, onClassifierSelection }) => {
  const sortProps = useTableSort({ initial: { field: "code", order: 1 } });
  const [filter, setFilter] = useState("");
  const sortState = sortProps;

  const downloadUrl = "/api/classifiers/download/" + division;
  //division = null;
  const { json: dataRaw, loading } = useApi("/classifiers/" + (division ?? ""));
  const data = (dataRaw ?? [])
    .map((d) => ({
      ...d,
      updated: new Date(d.updated).toLocaleDateString("en-us", { timeZone: "UTC" }),
      recHHFChange: d.hhf - d.recHHF,
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
          } else {
            return numSort(a, b, sortState.sortField, sortState.sortOrder);
          }
      }
    })
    .filter(
      (cur) =>
        !filter ||
        (cur.code + "###" + cur.name).toLowerCase().includes(filter.toLowerCase())
    );

  return (
    <DataTable
      size="small"
      className="text-xs md:text-base"
      style={{ maxWidth: "840px", margin: "auto" }}
      loading={loading}
      showGridlines
      selectionMode={"single"}
      selection={null}
      onSelectionChange={({ value }) => onClassifierSelection(value.code)}
      stripedRows
      header={
        <div className="flex">
          <div className="md:flex-grow-1" />
          <span className="w-12 md:w-16rem p-input-icon-left">
            <i className="pi pi-search" />
            <InputText
              className="w-12"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search"
            />
          </span>
          {/*<a href={downloadUrl} download className="px-5 py-2">
            <i
              className="pi pi-download"
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: "#ae9ef1",
              }}
            />
          </a>*/}
        </div>
      }
      lazy
      value={data ?? []}
      removableSort
      {...sortProps}
    >
      <Column
        field="code"
        header="Classifier"
        sortable
        body={(c) => <ClassifierCell info={c} />}
      />
      <Column
        field="quality"
        header="Div. Qual."
        sortable
        style={{ width: "9em", minWidth: "9em", maxWidth: "9em" }}
        body={(c, { field }) => {
          return (
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
          );
        }}
      />
      <Column
        field="allDivQuality"
        header="OA Qual."
        sortable
        style={{ width: "7em" }}
        body={(c, { field }) => {
          return (
            <div className="flex gap-2 justify-content-center text-xs">
              <div className="flex flex-column">
                <div style={{ fontSize: "1.5em", textAlign: "center" }}>
                  {letterRatingForPercent(c[field])}
                </div>
                <div>{renderPercent(c, { field })}</div>
              </div>
            </div>
          );
        }}
      />
      <Column
        field="runs"
        header="Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        field="recHHF"
        header="Rec. HHF"
        sortable
        body={renderHFOrNA}
        style={{ width: "100px" }}
      />
      <Column field="hhf" header="HQ HHF" sortable style={{ width: "100px" }} />
      <Column
        field="recHHFChange"
        header="HQ Minus Rec. HHF"
        sortable
        body={(c) => {
          if (!c.recHHF) {
            return "—";
          }
          const sign = c.recHHF > c.hhf ? "" : "+";
          const diff = c.hhf - c.recHHF;
          const diffPercent = 100 * (c.hhf / c.recHHF - 1);

          const hfDifference = diff.toFixed(4);
          const percentDifference = sign + " " + diffPercent.toFixed(2);

          return (
            <div>
              <div>{hfDifference}</div>
              <div style={{ fontSize: "0.8em" }}>({percentDifference}%)</div>
            </div>
          );
        }}
      />
      {/*<Column field="prevHHF" header="Prev. HHF" sortable />*/}
      {/*<Column field="updated" header="Updated" sortable />*/}
      {/*<Column
        field="runsLegacy"
        header="Legacy Scores"
        sortable
        headerTooltip="Total number of scores without HF data, only historical percentage (sus ඞ)."
        headerTooltipOptions={headerTooltipOptions}
      />*/}

      {/*
      <Column
        field="inverse100CurPercentPercentile"
        {...compactPercentColumnStyle}
        header="100%"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the current HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse95CurPercentPercentile"
        {...compactPercentColumnStyle}
        header="GM+"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 95% of the current HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse85CurPercentPercentile"
        {...compactPercentColumnStyle}
        header="M+"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 85% of the current HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse75CurPercentPercentile"
        {...compactPercentColumnStyle}
        header="A+"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 75% of the current HHF."
        headerTooltipOptions={headerTooltipOptions}
      />

      <Column
        field="inverse100RecPercentPercentile"
        {...compactPercentColumnStyle}
        header="Rec. 100%"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the recommended HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse95RecPercentPercentile"
        {...compactPercentColumnStyle}
        header="Rec. GM+"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 95% of the recommended HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse85RecPercentPercentile"
        {...compactPercentColumnStyle}
        header="Rec. M+"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 85% of the recommended HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse75RecPercentPercentile"
        {...compactPercentColumnStyle}
        header="Rec A+"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 75% of the recommended HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse60CurPercentPercentile"
        {...compactPercentColumnStyle}
        header="B+ Scores%"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 60% of the current HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse40CurPercentPercentile"
        {...compactPercentColumnStyle}
        header="C+ Scores%"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 40% of the current HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        align="right"
        {...compactNumberColumnStyle}
        field="runsTotalsLegitGM"
        header="GM"
        sortable
        headerTooltip="Number of runs that WOULD BE scored as 95% or more, using CURRENT HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        align="right"
        {...compactNumberColumnStyle}
        field="runsTotalsGM"
        header="Old GM"
        sortable
        headerTooltip="Number of runs that WERE scored as 95% or more, potentially using Older Historical HHF when the score was processed."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        align="right"
        {...compactNumberColumnStyle}
        field="runsTotalsLegitHundo"
        header="100%"
        sortable
        headerTooltip="Number of runs that WOULD BE scored as 100% or more, using CURRENT HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        align="right"
        {...compactNumberColumnStyle}
        field="runsTotalsHundo"
        header="Old 100%"
        sortable
        headerTooltip="Number of runs that WERE scored as 100% or more, potentially using Older Historical HHF when the score was processed."
        headerTooltipOptions={headerTooltipOptions}
      />*/}
    </DataTable>
  );
};

export default ClassifiersTable;
