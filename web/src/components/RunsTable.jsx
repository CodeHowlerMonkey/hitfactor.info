import cx from "classnames";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import qs from "query-string";
import { useEffect, useRef, useState } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { useDebounce } from "use-debounce";

import ReportDialog from "./ReportDialog";
import ShooterCell from "./ShooterCell";
import { clubMatchColumn, renderPercent, headerTooltipOptions } from "./Table";
import useTablePagination from "./Table/useTablePagination";
import useTableSort from "./Table/useTableSort";

import { sportForDivision } from "../../../shared/constants/divisions";
import { stageTargetsHitsText } from "../../../shared/utils/hitfactor";
import { useApi } from "../utils/client";
import { useIsHFU } from "../utils/useIsHFU";

const displayString = s => {
  if (!s?.length) {
    return null;
  }

  const splits = s.map((cur, idx, all) => {
    const prev = all[idx - 1] ?? 0;
    return (cur - prev).toFixed(2);
  });

  return [...splits, `(${s.length})`].join(" ");
};

const StageTime = ({ score }) => {
  const { stageTimeSecs: time, string0, string1, string2, string3 } = score ?? {};
  const vals =
    location.hostname === "localhost"
      ? [
          displayString(string0),
          displayString(string1),
          displayString(string2),
          displayString(string3),
        ].filter(Boolean)
      : [];

  return (
    <div data-tooltip-id="strings-tooltip" data-tooltip-content={vals.join("\n")}>
      <div className={cx({ "font-bold": vals.length >= 1 })}>
        {time ? `${time}s` : "—"}
      </div>
    </div>
  );
};

const TableFilter = ({ placeholder, onFilterChange }) => {
  const [filter, setFilter] = useState("");
  const [debouncedFilter] = useDebounce(filter, 750);
  useEffect(() => onFilterChange?.(debouncedFilter), [debouncedFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="p-input-icon-left w-12">
      <i className="pi pi-search" />
      <InputText
        className="w-12"
        value={filter}
        onChange={e => setFilter(e.target.value)}
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
    onChange={e => onFilter?.(e.value)}
    placeholder={placeholder}
    showClear
    maxSelectedLabels={1}
    filter={filter}
  />
);

export const useRunsTableData = ({ division, classifier }) => {
  const { query: pageQuery, reset: resetPage, ...pageProps } = useTablePagination();
  const { query, resetSort, ...sortProps } = useTableSort({
    mode: "multiple",
    onSortCallback: () => resetPage(),
    initial: [{ field: "hf", order: -1 }],
  });
  const isHFU = useIsHFU(division);
  useEffect(() => resetSort(), [isHFU]); // eslint-disable-line react-hooks/exhaustive-deps
  const [filter, setFilter] = useState("");
  // const [filterHHF, setFilterHHF] = useState(undefined);
  const [filterClub, setFilterClub] = useState(undefined);
  useEffect(() => resetPage(), [filter, filterClub]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtersQuery = qs.stringify(
    {
      filter,
      // hhf: filterHHF,
      club: filterClub,
    },
    {},
  );

  const downloadUrl = `/api/classifiers/download/${division}/${classifier}`;
  const apiEndpoint = !(division && classifier)
    ? null
    : `/classifiers/scores/${division}/${classifier}?${query}&${pageQuery}&${filtersQuery}`;
  const { json: apiData, loading } = useApi(apiEndpoint);

  const data = (apiData?.runs ?? []).map(d => ({
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
    // filterHHF,
    // setFilterHHF,
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
    // hhfs,
    sortProps,
    pageProps,
    setFilter,
    // setFilterHHF,
    setFilterClub,
  } = useRunsTableData({
    division,
    classifier,
  });
  const reportDialogRef = useRef(null);

  if (!loading && !data) {
    return "Classifier Not Found";
  }

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
            onFilterChange={f => setFilter(f)}
          />
        }
        totalRecords={runsTotal}
        filterDisplay="row"
      >
        <Column field="place" header="#" align="center" style={{ maxWidth: "4em" }} />
        <Column
          field="percentile"
          header="Top %"
          headerTooltip="Top Percentile for this score. Shows how many percent of scores are higher than this one."
          headerTooltipOptions={headerTooltipOptions}
          body={c => `${c.percentile.toFixed(2)}%`}
        />
        <Column
          field="memberNumber"
          header="Shooter"
          body={run => (
            <ShooterCell
              sport={sport}
              data={run}
              onClick={() => onShooterSelection?.(run.memberNumber)}
            />
          )}
        />
        <Column
          body={renderPercent}
          field="recPercent"
          header="Percent"
          sortable
          headerTooltip="Percentage of Recommended High Hit Factor."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column field="hf" header="HF" sortable />
        {/* TODO: migrate stageTimeSecs to Number and make it sortable */}
        <Column field="stageTimeSecs" header="Time" body={c => <StageTime score={c} />} />
        <Column
          field="hits"
          header="Hits"
          body={c => stageTargetsHitsText(c.targetHits) || "-"}
        />
        <Column
          hidden
          body={renderPercent}
          field="curPercent"
          header="HQ %"
          sortable
          headerTooltip="What classifier percentage this score would've earned if it was submitted today, with Current HHFs."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column
          hidden
          body={renderPercent}
          field="oldPercent"
          header="Old %"
          sortable
          headerTooltip="What classifier percentage this score would've earned with old HHFs (pre-March 2025)."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column
          {...clubMatchColumn}
          filter
          filterElement={options => (
            <DropdownFilter
              filter
              filterOptions={clubs}
              filterValueLabel="label"
              filterValue={options?.value}
              onFilter={value => {
                setFilterClub(value?.id);
                options.filterApplyCallback(value);
              }}
            />
          )}
        />
        <Column field="sd" header="Date" sortable />
        <Column
          body={c => (
            <ReportDialog.Button onClick={() => reportDialogRef.current.startReport(c)} />
          )}
        />
      </DataTable>
      <ReactTooltip id="strings-tooltip" />
    </>
  );
};

export default RunsTable;
