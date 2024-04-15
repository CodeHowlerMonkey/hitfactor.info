import qs from "query-string";
import { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Column } from "primereact/column";
import { useApi } from "../../../utils/client";
import {
  useTableSort,
  useTablePagination,
  headerTooltipOptions,
  renderPercent,
  renderPercentDiff,
} from "../../../components/Table";
import { useDebounce } from "use-debounce";
import ShooterCell from "../../../components/ShooterCell";

const classColumnProps = {
  sortable: true,
  align: "center",
  style: { maxWidth: "48px" },
  headerStyle: { fontSize: "11px" },
};

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

export const useShootersTableData = ({ division, inconsistencies, classFilter }) => {
  const { query: pageQuery, reset: resetPage, ...pageProps } = useTablePagination();
  const { query, ...sortProps } = useTableSort({
    mode: "multiple",
    onSortCallback: () => resetPage(),
    initial: [{ field: "reclassificationsRecPercentCurrent", order: -1 }],
  });
  const [filter, setFilter] = useState("");
  const filtersQuery = qs.stringify({
    filter,
    inconsistencies,
    classFilter,
  });

  const apiEndpoint = !division
    ? null
    : `/shooters/${division}?${query}&${pageQuery}&${filtersQuery}`;
  const apiData = useApi(apiEndpoint);
  const shootersTotal = apiData?.shootersTotal ?? 0;
  const shootersTotalWithoutFilters = apiData?.shootersTotalWithoutFilters ?? 0;

  const data = apiData?.shooters ?? [];

  return {
    data,
    shootersTotal,
    shootersTotalWithoutFilters,
    query,
    sortProps,
    pageProps,
    filter,
    setFilter,
    downloadUrl: "/api/shooters/download/" + division,
  };
};

const ShootersTable = ({ division, onShooterSelection, inconsistencies, classFilter }) => {
  const {
    data,
    shootersTotal,
    query,
    sortProps,
    pageProps,
    filter,
    setFilter,
    downloadUrl,
    shootersTotalWithoutFilters,
  } = useShootersTableData({ division, inconsistencies, classFilter });
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
        align="center"
        style={{ maxWidth: "4rem" }}
        headerTooltip="Shooter's rank / index in the current sort mode."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        field="percentile"
        header="Perc."
        style={{ maxWidth: "4rem" }}
        align="center"
        headerTooltip="Top percentile for this shooter in current sort mode."
        headerTooltipOptions={headerTooltipOptions}
        body={(c) => ((100 * c.index) / (shootersTotalWithoutFilters - 1)).toFixed(2) + "%"}
      />
      <Column
        field="memberNumber"
        header="Shooter"
        sortable
        body={(shooter) => (
          <ShooterCell data={shooter} onClick={() => onShooterSelection?.(shooter.memberNumber)} />
        )}
      />
      <Column field="recClass" header="Rec." {...classColumnProps} />
      <Column field="curHHFClass" header="Cur.HHF" {...classColumnProps} />
      <Column field="hqClass" header="HQ" {...classColumnProps} />
      <Column
        field="reclassificationsRecPercentCurrent"
        header="Rec.HHFs %"
        headerTooltip="Recommended classification percent of this shooter, if all their Y-flagged scores used the recommended HHFs for classifiers. Major Matches results stay the same."
        headerTooltipOptions={headerTooltipOptions}
        sortable
        body={renderPercent}
      />
      <Column
        field="reclassificationsCurPercentCurrent"
        header="Cur.HHFs %"
        headerTooltip="Current HHF classification percent of this shooter, if all their classifier scores would use the most recent HHFs. Major Matches results stay the same."
        headerTooltipOptions={headerTooltipOptions}
        sortable
        body={renderPercent}
      />
      <Column field="current" header="HQ %" sortable body={renderPercent} />
      <Column
        field="hqToCurHHFPercent"
        header="HQ vs Cur.HHF %"
        headerTooltip="Difference between official classification and current HHF classification percent."
        headerTooltipOptions={headerTooltipOptions}
        sortable
        body={renderPercentDiff}
      />
      <Column
        field="hqToRecPercent"
        header="HQ vs Rec.HHF %"
        headerTooltip="Difference between official and recommended classifications"
        headerTooltipOptions={headerTooltipOptions}
        sortable
        body={renderPercentDiff}
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
