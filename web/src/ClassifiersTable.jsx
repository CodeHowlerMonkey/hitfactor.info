import { useState } from "react";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { useApi } from "./client";
import useTableSort from "./common/useTableSort";

import { numSort, dateSort, classifierCodeSort } from "../../shared/utils/sort";

// TODO: merge as many columns into one as possible (code + name, maybe even virginia/fixed/comstock)
// TODO: add GM Runs - Cur GM Runs, and same for hundos

// TODO: TimeLine component for historical HHFs?

const ClassifiersTable = ({ division, onClassifierSelection }) => {
  const sortProps = useTableSort();
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
      <Column field="code" header="Number" sortable />
      <Column field="name" header="Name" sortable />
      <Column field="hhf" header="HHF" sortable />
      <Column
        field="top1PercentileCurPercent"
        header={
          <>
            1<sup>th</sup>%
          </>
        }
        sortable
      />
      <Column
        field="top2PercentileCurPercent"
        header={
          <>
            2<sup>th</sup>%
          </>
        }
        sortable
      />
      <Column
        field="top5PercentileCurPercent"
        header={
          <>
            5<sup>th</sup>%
          </>
        }
        sortable
      />

      <Column field="runsGM" header="GM Runs" sortable />
      <Column field="runsLegitGM" header="Cur HHF GM Runs" sortable />
      <Column field="runsHundo" header="Hundos" sortable />
      <Column field="runsLegitHundo" header="Cur HHF Hundos" sortable />

      <Column field="scoring" header="Scoring" sortable />
      <Column field="updated" header="Updated" dataType="date" sortable />
    </DataTable>
  );
};

export default ClassifiersTable;
