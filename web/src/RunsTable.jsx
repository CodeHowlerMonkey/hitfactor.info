import { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { useApi } from "./client";
import useTableSort from "./common/useTableSort";
import useTablePagination from "./common/useTablePagination";

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

// TODO: filter=menu, it has to be done on api cause of pagination fml
const RunsTable = ({ division, classifier }) => {
  const {
    query: pageQuery,
    reset: resetPage,
    ...pageProps
  } = useTablePagination();
  const { query, ...sortProps } = useTableSort("multiple", () => resetPage());
  const [filter, setFilter] = useState("");

  const apiData = useApi(
    `/classifiers/${division}/${classifier}?${query}&${pageQuery}`
  );
  const { code, name } = apiData?.info || {};
  // info bucket has total runs too for header, needs to be renamed
  const runsTotal = apiData?.runsTotal;

  const data = (apiData?.runs ?? []).map((d) => ({
    ...d,
    updated: new Date(d.updated).toLocaleDateString(),
  }));

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
      {...sortProps}
      {...pageProps}
      totalRecords={runsTotal}
    >
      <Column field="place" header="#" sortable />
      <Column field="memberNumber" header="Shooter" sortable />
      <Column field="clubid" header="Club" sortable />
      <Column field="hf" header="HF" sortable />
      <Column field="percent" header="Percent" sortable />
      <Column field="curPercent" header="Current Percent" sortable />
      <Column field="curPercentMinusPercent" header="Percent Change" sortable />
      <Column field="percentile" header="Percentile" sortable />
      <Column field="sd" header="Date" sortable />
    </DataTable>
  );
};

export default RunsTable;
