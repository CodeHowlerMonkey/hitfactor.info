import _ from "lodash";
import qs from "query-string";
import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { useApi } from "./client";
import useTableSort from "./common/useTableSort";
import useTablePagination from "./common/useTablePagination";
import { headerTooltipOptions } from "./common/Table";
import { Dropdown } from "primereact/dropdown";
import { useDebounce } from "use-debounce";
import { bgColorForClass, fgColorForClass } from "./utils/color";

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

const TableFilter = ({ placeholder, onFilterChange }) => {
  const [filter, setFilter] = useState("");
  const [debouncedFilter] = useDebounce(filter, 750);
  useEffect(() => onFilterChange?.(debouncedFilter), [debouncedFilter]);

  return (
    <span className="p-input-icon-left">
      <i className="pi pi-search" />
      <InputText
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={placeholder}
      />
    </span>
  );
};

export const useRunsTableData = ({ division, classifier }) => {
  const {
    query: pageQuery,
    reset: resetPage,
    ...pageProps
  } = useTablePagination();
  const { query, ...sortProps } = useTableSort("multiple", () => resetPage());
  const [filter, setFilter] = useState("");
  const [filterHHF, setFilterHHF] = useState(undefined);
  const filtersQuery = qs.stringify({ filter, hhf: filterHHF });

  const apiEndpoint = !(division && classifier)
    ? null
    : `/classifiers/${division}/${classifier}?${query}&${pageQuery}&${filtersQuery}`;
  const apiData = useApi(apiEndpoint);
  const info = apiData?.info || {};
  const { hhfs } = info;
  // info bucket has total runs too for header, needs to be renamed
  const runsTotal = apiData?.runsTotal;

  const data = (apiData?.runs ?? []).map((d) => ({
    ...d,
    updated: new Date(d.updated).toLocaleDateString(),
  }));

  return {
    info,
    data,
    runsTotal,
    hhfs,
    query,
    sortProps,
    pageProps,
    filter,
    setFilter,
    filterHHF,
    setFilterHHF,
  };
};

const RunsTable = ({
  data,
  runsTotal,
  hhfs,
  sortProps,
  pageProps,
  setFilter,
  setFilterHHF,
}) => {
  const HistoricalHHFFilter = (options) => (
    <Dropdown
      value={options.value}
      options={_.uniqBy(hhfs, (c) => c.hhf)}
      onChange={(e) => {
        setFilterHHF(e.value?.hhf);
        options.filterApplyCallback(e.value);
      }}
      optionLabel="hhf"
      placeholder="Any"
      showClear
      maxSelectedLabels={1}
    />
  );

  return (
    <DataTable
      stripedRows
      lazy
      value={data ?? []}
      tableStyle={{ minWidth: "50rem" }}
      {...sortProps}
      {...pageProps}
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      paginatorLeft={<h2>Scores</h2>}
      paginatorRight={
        <TableFilter
          placeholder="Filter by Club or Shooter"
          onFilterChange={(f) => setFilter(f)}
        />
      }
      totalRecords={runsTotal}
      filterDisplay="row"
    >
      <Column
        field="index"
        header="#"
        sortable
        headerTooltip="Index for the dataRow with current filters and sorting options applied. Can be used for manual counting of things. "
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="place"
        header="Place"
        sortable
        headerTooltip="Record place for this score. Stays the same unless someone beats this score."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="memberNumber"
        header="Shooter"
        sortable
        body={(run) => (
          <>
            <div>
              {run.memberNumber}
              <Tag
                rounded
                severity="info"
                value={run.class}
                style={{
                  backgroundColor: bgColorForClass[run.class],
                  color: fgColorForClass[run.class],
                  padding: "1px 4px",
                  fontSize: "11px",
                  margin: "auto",
                  position: "absolute",
                  transform: "translateX(4px)",
                }}
              />
            </div>
            <div style={{ fontSize: 14 }}>{run.name}</div>
          </>
        )}
      />
      <Column field="clubid" header="Club" sortable />
      <Column field="hf" header="HF" sortable />
      <Column
        field="historicalHHF"
        header="Historical HHF"
        sortable
        showFilterMenu={false}
        filter
        filterElement={HistoricalHHFFilter}
        headerTooltip="Calculated HHF based on HF and Percent. Shows historical HHF value during the time when this score was processed."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="percent"
        header="Percent"
        sortable
        headerTooltip="Classifier percentage for this score during the time that it was processed by USPSA. Maxes out at 100%."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="curPercent"
        header="Current Percent"
        sortable
        headerTooltip="What classifier percentage this score would've earned if it was submitted today, with Current HHFs."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="percentMinusCurPercent"
        header="Percent Change"
        sortable
        headerTooltip="Difference between calculated percent when run was submitted and what it would've been with current High Hit-Factor. \n Positive values mean classifier became harder, negative - easier."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column field="percentile" header="Percentile" sortable />
      <Column field="sd" header="Date" sortable />
    </DataTable>
  );
};

export default RunsTable;
