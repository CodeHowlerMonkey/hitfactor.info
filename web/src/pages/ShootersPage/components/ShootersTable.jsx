import qs from "query-string";
import { useEffect, useState, useRef } from "react";
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
import ReportDialog from "../../../components/ReportDialog";
import { sportForDivision } from "../../../../../shared/constants/divisions";

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
  const { json: apiData, loading } = useApi(apiEndpoint);
  const shootersTotal = apiData?.shootersTotal ?? 0;
  const shootersTotalWithoutFilters = apiData?.shootersTotalWithoutFilters ?? 0;

  const data = apiData?.shooters ?? [];

  return {
    data,
    loading,
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

const ShootersTable = ({
  division,
  onShooterSelection,
  inconsistencies,
  classFilter,
}) => {
  const {
    data,
    loading,
    shootersTotal,
    query,
    sortProps,
    pageProps,
    filter,
    setFilter,
    downloadUrl,
    shootersTotalWithoutFilters,
  } = useShootersTableData({ division, inconsistencies, classFilter });
  const reportDialogRef = useRef(null);
  return (
    <>
      <ReportDialog type="Shooter" ref={reportDialogRef} />
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
        paginatorClassName="shooters-table-paginator pb-4 md:pb-0 justify-content-around "
        paginatorRight={
          <>
            <TableFilter
              placeholder="Filter by Name or Number"
              onFilterChange={(f) => setFilter(f)}
            />
            {/*<a href={downloadUrl} download className="px-5 py-2">
            <i
              className="pi pi-download"
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: "#ae9ef1",
              }}
            />
          </a>*/}
          </>
        }
        totalRecords={shootersTotal}
      >
        <Column
          field="index"
          header="#"
          align="center"
          style={{ maxWidth: "4em" }}
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
          body={(c) =>
            ((100 * c.index) / (shootersTotalWithoutFilters - 1)).toFixed(2) + "%"
          }
        />
        <Column
          field="memberNumber"
          header="Shooter"
          maxWidth="fit-content"
          sortable
          body={(shooter) => (
            <ShooterCell
              sport={sportForDivision(division)}
              data={shooter}
              onClick={() => onShooterSelection?.(shooter.memberNumber)}
            />
          )}
        />
        <Column
          field="reclassificationsRecPercentCurrent"
          header="Rec."
          headerTooltip="Recommended classification percent of this shooter, using best 6 out of most revent 10 scores and recommended HHFs for classifiers. B/C flags are off, but duplicates are still allowed and only best duplicate is used. Major Matches results stay the same."
          headerTooltipOptions={headerTooltipOptions}
          sortable
          body={renderPercent}
        />
        <Column
          field="reclassificationsCurPercentCurrent"
          header="Cur."
          headerTooltip="Current HHF classification percent of this shooter, if all their classifier scores would use the most recent HHFs. Major Matches results stay the same."
          headerTooltipOptions={headerTooltipOptions}
          sortable
          body={renderPercent}
        />
        <Column field="current" header="HQ" sortable body={renderPercent} />
        <Column
          field="hqToRecPercent"
          header="HQ vs Rec.HHF %"
          headerTooltip="Difference between official and recommended classifications"
          headerTooltipOptions={headerTooltipOptions}
          sortable
          body={renderPercentDiff}
        />
        <Column
          field="hqToCurHHFPercent"
          header="HQ vs Cur.HHF %"
          headerTooltip="Difference between official classification and current HHF classification percent."
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
        <Column
          body={(c) => (
            <ReportDialog.Button onClick={() => reportDialogRef.current.startReport(c)} />
          )}
        />
      </DataTable>
    </>
  );
};

export default ShootersTable;
