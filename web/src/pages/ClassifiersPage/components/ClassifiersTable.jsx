import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { useState } from "react";

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

const ClassifiersTable = ({ division, onClassifierSelection }) => {
  const isSCSA = division.startsWith("scsa");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { resetSort, ...sortProps } = useTableSort({
    initial: { field: "code", order: 1 },
  });
  const [filter, setFilter] = useState("");
  const sortState = sortProps;

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
    .filter(
      cur =>
        !filter ||
        `${cur.code}###${cur.name}`.toLowerCase().includes(filter.toLowerCase()),
    );

  return (
    <DataTable
      size="small"
      className="text-xs md:text-base my-4"
      style={{ maxWidth: "640px", margin: "auto" }}
      loading={loading}
      showGridlines
      selectionMode="single"
      selection={null}
      onSelectionChange={({ value }) => onClassifierSelection(value.code)}
      stripedRows
      lazy
      value={data ?? []}
      removableSort
      {...sortProps}
    >
      <Column
        field="code"
        header="Classifier"
        sortable
        body={c => <ClassifierCell info={c} showScoring />}
      />
      <Column
        field="quality"
        header="Quality"
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
        field="runs"
        header="Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        field="recHHF"
        header={isSCSA ? "Rec. Peak Time" : "Rec. HHF"}
        sortable
        style={{ width: "100px" }}
      />
    </DataTable>
  );
};

export default ClassifiersTable;
