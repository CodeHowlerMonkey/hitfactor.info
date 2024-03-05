import qs from "query-string";
import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { useApi } from "../../../utils/client";
import {
  useTableSort,
  useTablePagination,
  headerTooltipOptions,
} from "../../../components/Table";
import { useDebounce } from "use-debounce";
import ShooterCell from "../../../components/ShooterCell";

// TODO: extract into common components, right now this is copypasted from RunsTable
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

export const useShootersTableData = ({ division }) => {
  const {
    query: pageQuery,
    reset: resetPage,
    ...pageProps
  } = useTablePagination();
  const { query, ...sortProps } = useTableSort({
    mode: "multiple",
    onSortCallback: () => resetPage(),
    initial: [{ field: "current", order: -1 }],
  });
  const [filter, setFilter] = useState("");
  const filtersQuery = qs.stringify({
    filter,
  });

  const apiEndpoint = !division
    ? null
    : `/shooters/${division}?${query}&${pageQuery}&${filtersQuery}`;
  const apiData = useApi(apiEndpoint);
  const shootersTotal = apiData?.shootersTotal ?? 0;

  const data = apiData?.shooters ?? [];

  return {
    data,
    shootersTotal,
    query,
    sortProps,
    pageProps,
    filter,
    setFilter,
    downloadUrl: "/api/shooters/download/" + division,
  };
};

const ShootersTable = ({ division, onShooterSelection }) => {
  const {
    data,
    shootersTotal,
    query,
    sortProps,
    pageProps,
    filter,
    setFilter,
    downloadUrl,
  } = useShootersTableData({ division });
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
      paginatorLeft={<h2>Shooters</h2>}
      paginatorRight={
        <>
          <TableFilter
            placeholder="Filter by Club or Shooter"
            onFilterChange={(f) => setFilter(f)}
          />
          <a href={downloadUrl} download className="px-5 py-2">
            <i
              className="pi pi-download"
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: "#ae9ef1",
              }}
            />
          </a>
        </>
      }
      totalRecords={shootersTotal}
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
        field="memberNumber"
        header="Shooter"
        sortable
        body={(shooter) => (
          <ShooterCell
            memberNumber={shooter.memberNumber}
            name={shooter.name}
            class={shooter.class}
            onClick={() => onShooterSelection?.(shooter.memberNumber)}
          />
        )}
      />
      <Column
        field="reclassificationsCurPercentCurrent"
        header="Cur.HHFs %"
        headerTooltip="Current classification percent of this shooter, if all their Y-flagged scores used the most recent HHFs for classifiers. Major Matches results stay the same."
        headerTooltipOptions={headerTooltipOptions}
        sortable
        body={(c) => c.reclassificationsCurPercentCurrent.toFixed(2) + "%"}
      />
      <Column
        field="current"
        header="Cur. %"
        sortable
        body={(c) => c.current.toFixed(2) + "%"}
      />
      <Column
        field="high"
        header="High %"
        sortable
        body={(c) => c.high.toFixed(2) + "%"}
      />
      <Column
        field="currentRank"
        header="Cur. Rank"
        sortable
        headerTooltip="TopXXX Rank of that Shooter baed on their Current Division Percentage"
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="highRank"
        header="High. Rank"
        sortable
        headerTooltip="TopXXX Rank of that Shooter baed on their(and others) High Division Percentage"
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="currentPercentile"
        header="Cur. Percentile"
        sortable
        body={(c) => "Top " + c.currentPercentile.toFixed(2) + "%"}
      />
      <Column
        field="highPercentile"
        header="High Percentile"
        sortable
        body={(c) => "Top " + c.highPercentile.toFixed(2) + "%"}
      />
      <Column
        field="age"
        header="Age"
        body={(c) => (c.age ? (c.age || 0).toFixed(1) + "mo" : "—")}
        sortable
        headerTooltip="Average age in months of Y-flagged scores (classifiers & majors) of this shooter"
        headerTooltipOptions={headerTooltipOptions}
      />
    </DataTable>
  );
};

export default ShootersTable;
