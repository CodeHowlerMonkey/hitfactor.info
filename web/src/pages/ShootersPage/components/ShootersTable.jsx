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
import { bgColorForClass, fgColorForClass } from "../../../utils/color";
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
    downloadUrl: "/api/" + apiEndpoint,
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
            <i className="pi pi-download" />
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
      <Column field="current" header="Cur. %" sortable />
      <Column field="high" header="High %" sortable />
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
      <Column field="currentPercentile" header="Cur. Percentile" sortable />
      <Column field="highPercentile" header="High Percentile" sortable />
    </DataTable>
  );
};

export default ShootersTable;
