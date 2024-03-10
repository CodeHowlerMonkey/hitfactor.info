import uniqBy from "lodash.uniqby";
import qs from "query-string";
import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Checkbox } from "primereact/checkbox";
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

const LegacyCheckbox = ({ onChange }) => {
  const [value, setValue] = useState(false);
  useEffect(() => onChange?.(value), [value]);
  return (
    <>
      <Checkbox
        inputId="legacyCheck"
        checked={value}
        onChange={(e) => setValue(e.checked)}
      />
      <label htmlFor="legacyCheck" className="ml-2 mr-4">
        Incl. Legacy
      </label>
    </>
  );
};

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
  const [legacy, setLegacy] = useState(undefined);
  const filtersQuery = qs.stringify(
    {
      filter,
      hhf: filterHHF,
      club: filterClub,
      legacy: legacy ? 1 : undefined,
    },
    {}
  );

  const downloadUrl = `/api/classifiers/download/${division}/${classifier}`;
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
    setLegacy,
    filterClub,
    setFilterClub,
    downloadUrl,
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
  setLegacy,
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
        <div className="flex flex-row align-items-center">
          <LegacyCheckbox onChange={(v) => setLegacy(!!v)} />
          <TableFilter
            placeholder="Filter by Club or Shooter"
            onFilterChange={(f) => setFilter(f)}
          />
        </div>
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
              setFilterClub(value?.id);
              options.filterApplyCallback(value);
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
            filterOptions={uniqBy(hhfs, (c) => c.hhf)}
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
        field="recPercent"
        header="Rec. Percent"
        sortable
        headerTooltip="What classifier percentage this score SHOULD earn if Recommended HHFs are used."
        headerTooltipOptions={headerTooltipOptions}
      />
      {/*<Column
        field="percentMinusCurPercent"
        header="Percent Change"
        sortable
        headerTooltip="Difference between calculated percent when run was submitted and what it would've been with current High Hit-Factor. \n Positive values mean classifier became harder, negative - easier."
        headerTooltipOptions={headerTooltipOptions}
       />*/}
      <Column field="percentile" header="Percentile" sortable />
      <Column field="sd" header="Date" sortable />
    </DataTable>
  );
};

export default RunsTable;
