import { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { useApi } from "./client";
import useTableSort from "./common/useTableSort";

import { numSort, dateSort, stringSort } from "./utils/sort";

/*
sd	"4/09/17"
memberNumber	"A29646"
clubid	"NW01"
place	0
percent	75.83
curPercent	108.85
percentile	0
hf	91

// TODO: fields for shooter's runs with different classifiers
// classifier   "03-02"
// club_name	"Paul Bunyan Rifle & Sportsmen's Club"
// code	"E"
// source	"Stage Score"

// TODO: more fields?
*/

// TODO: multisort must have
// TODO: filter=menu
const RunsTable = ({ division, classifier }) => {
  const sortProps = useTableSort();
  const sortState = sortProps;
  const { sortField, sortOrder } = sortProps;
  console.log(sortProps);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  console.log(page);

  const apiData = useApi(
    `/classifiers/${division}/${classifier}?sort=${sortField}&order=${sortOrder}&page=${page}`
  );
  const { code, name } = apiData?.info || {};
  // info bucket has total runs too for header, needs to be renamed
  const runsTotal = apiData?.runsTotal;

  const data = (apiData?.runs ?? [])
    .map((d) => ({
      ...d,
      updated: new Date(d.updated).toLocaleDateString(),
    }))
    // better more generalized sorting shit can be moved to sort utils too
    .sort((a, b) => {
      switch (sortState.sortField) {
        case "sd":
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
      stripedRows
      header={
        <div className="flex justify-content-between">
          <Button icon="pi pi-chevron-left" rounded text aria-label="Back">
            Classifiers List
          </Button>
          <span style={{ fontSize: "2rem", margin: "auto" }}>
            {code} {name}
          </span>
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
      paginator
      rows={100}
      rowsPerPageOptions={[100]}
      page={page}
      onPage={(e) => setPage(e.page + 1)}
      totalRecords={runsTotal}
    >
      <Column field="place" header="#" sortable />
      <Column field="hf" header="HF" sortable />
      <Column field="percent" header="%%" sortable />
      <Column field="curPercent" header="Current %%" sortable />
      <Column field="percentile" header="Percentile" sortable />
      <Column field="memberNumber" header="Shooter" sortable />
      <Column field="sd" header="Date" sortable />
      <Column field="clubid" header="Club" sortable />
    </DataTable>
  );
};

export default RunsTable;
