import _ from "lodash";
import qs from "query-string";
import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { useApi } from "../utils/client";
import useTableSort from "./Table/useTableSort";
import useTablePagination from "./Table/useTablePagination";
import { headerTooltipOptions } from "./Table/Table";
import { Dropdown } from "primereact/dropdown";
import { useDebounce } from "use-debounce";
import { bgColorForClass, fgColorForClass } from "../utils/color";
import { stringSort } from "../../../shared/utils/sort";
import ShooterCell from "./ShooterCell";

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

const DropdownFilter = ({
  onFilter,
  filterOptions,
  filterValue,
  filterValueLabel,
  placeholder = "Any",
  filter,
}) => (
  <Dropdown
    options={filterOptions}
    value={filterValue}
    optionLabel={filterValueLabel}
    onChange={(e) => onFilter?.(e.value)}
    placeholder={placeholder}
    showClear
    maxSelectedLabels={1}
    filter={filter}
  />
);

export const useRunsTableData = ({ division, classifier }) => {
  const {
    query: pageQuery,
    reset: resetPage,
    ...pageProps
  } = useTablePagination();
  const { query, ...sortProps } = useTableSort({
    mode: "multiple",
    onSortCallback: () => resetPage(),
    initial: [{ field: "hf", order: -1 }],
  });
  const [filter, setFilter] = useState("");
  const [filterHHF, setFilterHHF] = useState(undefined);
  const [filterClub, setFilterClub] = useState(undefined);
  const filtersQuery = qs.stringify({
    filter,
    hhf: filterHHF,
    club: filterClub,
  });

  const apiEndpoint = !(division && classifier)
    ? null
    : `/classifiers/${division}/${classifier}?${query}&${pageQuery}&${filtersQuery}`;
  const apiData = useApi(apiEndpoint);
  const info = apiData?.info || {};
  const { hhfs, clubs } = info;
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
    clubs,
    hhfs,
    query,
    sortProps,
    pageProps,
    filter,
    setFilter,
    filterHHF,
    setFilterHHF,
    filterClub,
    setFilterClub,
  };
};

const RunsTable = ({
  data,
  runsTotal,
  clubs,
  hhfs,
  sortProps,
  pageProps,
  setFilter,
  setFilterHHF,
  setFilterClub,
  onShooterSelection,
}) => {
  return (
    <DataTable
      loading={!data?.length}
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
          <ShooterCell
            memberNumber={run.memberNumber}
            name={run.name}
            class={run.class}
            onClick={() => onShooterSelection?.(run.memberNumber)}
          />
        )}
      />
      <Column
        field="clubid"
        header="Club"
        sortable
        showFilterMenu={false}
        filter
        filterElement={(options) => (
          <DropdownFilter
            filter
            filterOptions={clubs}
            filterValueLabel="label"
            filterValue={options?.value}
            onFilter={(value) => {
              console.log("on filter");
              setFilterClub(value?.id);
              options.filterApplyCallback(value);
              console.log(value);
            }}
          />
        )}
      />
      <Column field="hf" header="HF" sortable />
      <Column
        field="historicalHHF"
        header="Historical HHF"
        sortable
        showFilterMenu={false}
        filter
        filterElement={(options) => (
          <DropdownFilter
            filterOptions={_.uniqBy(hhfs, (c) => c.hhf)}
            filterValueLabel="hhf"
            filterValue={options?.value}
            onFilter={(value) => {
              setFilterHHF(value?.hhf);
              options.filterApplyCallback(value);
            }}
          />
        )}
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
