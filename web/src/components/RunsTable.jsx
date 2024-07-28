import qs from "query-string";
import { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Checkbox } from "primereact/checkbox";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { useApi } from "../utils/client";
import useTableSort from "./Table/useTableSort";
import useTablePagination from "./Table/useTablePagination";
import { clubMatchColumn, renderPercent, headerTooltipOptions } from "./Table";
import { Dropdown } from "primereact/dropdown";
import { useDebounce } from "use-debounce";
import ShooterCell from "./ShooterCell";
import ReportDialog from "./ReportDialog";
import { sportForDivision } from "../../../shared/constants/divisions";

const TableFilter = ({ placeholder, onFilterChange }) => {
  const [filter, setFilter] = useState("");
  const [debouncedFilter] = useDebounce(filter, 750);
  useEffect(() => onFilterChange?.(debouncedFilter), [debouncedFilter]);

  return (
    <span className="p-input-icon-left w-12">
      <i className="pi pi-search" />
      <InputText
        className="w-12"
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
    className="hidden md:flex max-w-min"
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
  const { query: pageQuery, reset: resetPage, ...pageProps } = useTablePagination();
  const { query, ...sortProps } = useTableSort({
    mode: "multiple",
    onSortCallback: () => resetPage(),
    initial: [{ field: "hf", order: -1 }],
  });
  const [filter, setFilter] = useState("");
  // const [filterHHF, setFilterHHF] = useState(undefined);
  const [filterClub, setFilterClub] = useState(undefined);
  useEffect(() => resetPage(), [filter, filterClub]);
  //const [legacy, setLegacy] = useState(undefined);
  const filtersQuery = qs.stringify(
    {
      filter,
      //hhf: filterHHF,
      club: filterClub,
      //legacy: legacy ? 1 : undefined,
    },
    {}
  );

  const downloadUrl = `/api/classifiers/download/${division}/${classifier}`;
  const apiEndpoint = !(division && classifier)
    ? null
    : `/classifiers/scores/${division}/${classifier}?${query}&${pageQuery}&${filtersQuery}`;
  const { json: apiData, loading } = useApi(apiEndpoint);

  const data = (apiData?.runs ?? []).map((d) => ({
    ...d,
    updated: new Date(d.updated).toLocaleDateString("en-us", { timeZone: "UTC" }),
  }));

  return {
    loading,
    data,
    runsTotal: apiData?.runsTotalWithFilters,
    query,
    sortProps,
    pageProps,
    filter,
    setFilter,
    //filterHHF,
    //setFilterHHF,
    //setLegacy,
    filterClub,
    setFilterClub,
    downloadUrl,
  };
};

const RunsTable = ({ classifier, division, clubs, onShooterSelection }) => {
  const {
    loading,
    data,
    runsTotal,
    hhfs,
    sortProps,
    pageProps,
    setFilter,
    // setFilterHHF,
    setFilterClub,
    //setLegacy,
  } = useRunsTableData({
    division,
    classifier,
  });
  if (!loading && !data) {
    return "Classifier Not Found";
  }

  const reportDialogRef = useRef(null);
  const sport = sportForDivision(division);

  return (
    <>
      <ReportDialog type="Score" ref={reportDialogRef} />
      <DataTable
        className="text-xs md:text-base"
        loading={loading}
        stripedRows
        lazy
        value={data ?? []}
        tableStyle={{ minWidth: "50rem" }}
        {...sortProps}
        {...pageProps}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
        paginatorClassName="shooters-table-paginator pb-4 md:pb-0 justify-content-around"
        paginatorRight={
          <TableFilter
            placeholder="Filter by Club or Shooter"
            onFilterChange={(f) => setFilter(f)}
          />
        }
        totalRecords={runsTotal}
        filterDisplay="row"
      >
        <Column field="place" header="#" align="center" style={{ maxWidth: "4em" }} />
        {/*<Column
        field="index"
        header="#"
        headerTooltip="Index for the dataRow with current filters and sorting options applied. Can be used for manual counting of things. "
        headerTooltipOptions={headerTooltipOptions}
      <Column
        field="place"
        //header="Place"
        header="# / Perc."
        headerTooltip="Record place for this score. Stays the same unless someone beats this score."
        headerTooltipOptions={headerTooltipOptions}
        body={(c) => [c.place, c.percentile].join(" / ")}
      />
    />*/}
        <Column
          field="percentile"
          header="Perc."
          headerTooltip="Percentile for this score. Shows how many percent of scores are higher than this one."
          headerTooltipOptions={headerTooltipOptions}
          body={(c) => c.percentile.toFixed(2) + "%"}
        />
        <Column
          field="memberNumber"
          header="Shooter"
          body={(run) => (
            <ShooterCell
              sport={sport}
              data={run}
              onClick={() => onShooterSelection?.(run.memberNumber)}
            />
          )}
        />
        <Column field="hf" header="HF" sortable />
        <Column
          hidden={sport !== "hfu"}
          body={renderPercent}
          field="recPercent"
          header="Percent"
          sortable
        />
        <Column
          hidden={sport !== "uspsa"}
          body={renderPercent}
          field="recPercent"
          header="Rec. %"
          sortable
          headerTooltip="What classifier percentage this score SHOULD earn if Recommended HHFs are used."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column
          hidden={sport !== "uspsa"}
          body={renderPercent}
          field="curPercent"
          header="Cur. %"
          sortable
          headerTooltip="What classifier percentage this score would've earned if it was submitted today, with Current HHFs."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column
          hidden={sport !== "uspsa"}
          body={renderPercent}
          field="percent"
          header="HQ %"
          sortable
          headerTooltip="Classifier percentage for this score during the time that it was processed by USPSA. Maxes out at 100%."
          headerTooltipOptions={headerTooltipOptions}
        />
        {/*<Column
        field="percentMinusCurPercent"
        header="Percent Change"
        sortable
        headerTooltip="Difference between calculated percent when run was submitted and what it would've been with current High Hit-Factor. \n Positive values mean classifier became harder, negative - easier."
        headerTooltipOptions={headerTooltipOptions}
       />*/}
        <Column
          {...clubMatchColumn}
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
        <Column field="sd" header="Date" sortable />
        <Column
          body={(c) => (
            <ReportDialog.Button onClick={() => reportDialogRef.current.startReport(c)} />
          )}
        />
      </DataTable>
    </>
  );
};

export default RunsTable;
