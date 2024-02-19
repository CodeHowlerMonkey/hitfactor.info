import { useState } from "react";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { Textfit } from "react-textfit";

import { useApi } from "./client";
import useTableSort from "./common/useTableSort";
import { headerTooltipOptions } from "./common/Table";

import { numSort, dateSort, classifierCodeSort } from "../../shared/utils/sort";

// TODO: add GM Runs - Cur GM Runs, and same for hundos

// TODO: TimeLine component for historical HHFs?

const renderPercent = (c, { field }) => {
  const value = c[field];
  if (value < 0) {
    return "—";
  }

  return <>{value}%</>;
};

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
        body={(c) => (
          <div className="flex flex-column w-12rem">
            <div className="flex flex-row justify-content-between">
              <div className="font-bold text-color-secondary">{c.code}</div>
              <div className="text-xs text-color-secondary">{c.scoring}</div>
            </div>
            <div className="text-color">
              <Textfit max={16} mode="single">
                {c.name}
              </Textfit>
            </div>
          </div>
        )}
      />
      <Column field="hhf" header="HHF" sortable />
      <Column field="updated" header="Updated" sortable />
      <Column field="runs" header="Scores" sortable />

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
      />
    </DataTable>
  );
};

export default ClassifiersTable;
