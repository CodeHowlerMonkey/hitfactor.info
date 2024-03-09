import { useState } from "react";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";

import { useApi } from "../../../utils/client";
import useTableSort from "../../../components/Table/useTableSort";
import { headerTooltipOptions } from "../../../components/Table/Table";

import {
  numSort,
  dateSort,
  classifierCodeSort,
} from "../../../../../shared/utils/sort";
import ClassifierCell from "../../../components/ClassifierCell";
import { renderPercent } from "../../../components/Table";

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
  const data = (useApi("/classifiers/" + (division ?? "")) ?? [])
    .map((d) => ({
      ...d,
      updated: new Date(d.updated).toLocaleDateString(),
    }))
    .sort((a, b) => {
      switch (sortState.sortField) {
        case "code":
          return classifierCodeSort(
            a,
            b,
            sortState.sortField,
            sortState.sortOrder
          );

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
        (cur.code + "###" + cur.name)
          .toLowerCase()
          .includes(filter.toLowerCase())
    );

  return (
    <DataTable
      showGridlines
      size="small"
      selectionMode={"single"}
      selection={null}
      onSelectionChange={({ value }) => onClassifierSelection(value.code)}
      stripedRows
      header={
        <div className="flex justify-content-end">
          <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search"
            />
          </span>
          <a href={downloadUrl} download className="px-5 py-2">
            <i
              className="pi pi-download"
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: "#ae9ef1",
              }}
            />
          </a>
        </div>
      }
      lazy
      value={data ?? []}
      tableStyle={{ minWidth: "50rem" }}
      removableSort
      {...sortProps}
    >
      <Column
        bodyStyle={{ width: "12rem" }}
        field="code"
        header="Classifier"
        sortable
        body={(c) => <ClassifierCell {...c} />}
      />
      <Column field="recHHF" header="Rec. HHF" sortable />
      <Column field="hhf" header="HHF" sortable />
      <Column field="prevHHF" header="Prev. HHF" sortable />
      <Column field="updated" header="Updated" sortable />
      <Column field="runs" header="Scores" sortable />
      <Column
        field="runsLegacy"
        header="Legacy Scores"
        sortable
        headerTooltip="Total number of scores without HF data, only historical percentage (sus ඞ)."
        headerTooltipOptions={headerTooltipOptions}
      />

      <Column
        field="inverse100CurPercentPercentile"
        {...compactPercentColumnStyle}
        header="100% Scores%"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the current HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse95CurPercentPercentile"
        {...compactPercentColumnStyle}
        header="GM Scores%"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 95% of the current HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse85CurPercentPercentile"
        {...compactPercentColumnStyle}
        header="M+ Scores%"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 85% of the current HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="inverse75CurPercentPercentile"
        {...compactPercentColumnStyle}
        header="A+ Scores%"
        body={renderPercent}
        sortable
        headerTooltip="Total percentage of scores that are equal or higher to the 75% of the current HHF."
        headerTooltipOptions={headerTooltipOptions}
      />
      {/*<Column
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
      />*/}

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
      />
    </DataTable>
  );
};

export default ClassifiersTable;
