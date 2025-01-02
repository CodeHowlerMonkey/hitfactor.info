import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import qs from "query-string";
import { useEffect, useState, useRef } from "react";
import { useDebounce } from "use-debounce";

import { sportForDivision } from "../../../../../shared/constants/divisions";
import ReportDialog from "../../../components/ReportDialog";
import ShooterCell from "../../../components/ShooterCell";
import {
  useTableSort,
  useTablePagination,
  headerTooltipOptions,
  renderPercent,
  renderHFOrNA,
} from "../../../components/Table";
import { useApi } from "../../../utils/client";
import { useIsHFU } from "../../../utils/useIsHFU";

// TODO: extract into common components, right now this is copypasted from RunsTable
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

export const useShootersTableData = ({ division, inconsistencies, classFilter }) => {
  const { query: pageQuery, reset: resetPage, ...pageProps } = useTablePagination();
  const { query, resetSort, ...sortProps } = useTableSort({
    mode: "multiple",
    onSortCallback: () => resetPage(),
    initial: [{ field: "reclassificationsRecPercentCurrent", order: -1 }],
  });
  const isHFU = useIsHFU(division);
  useEffect(() => resetSort(), [isHFU]); // eslint-disable-line react-hooks/exhaustive-deps
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
    downloadUrl: `/api/shooters/download/${division}`,
  };
};

const ShootersTable = ({
  division,
  onShooterSelection,
  inconsistencies,
  classFilter,
}) => {
  const { data, loading, shootersTotal, sortProps, pageProps, setFilter } =
    useShootersTableData({ division, inconsistencies, classFilter });
  const isHFU = useIsHFU(division);
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
              onFilterChange={f => setFilter(f)}
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
          field="place"
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
          body={c => `${c.percentile.toFixed(2)}%`}
        />
        <Column
          field="memberNumber"
          header="Shooter"
          maxWidth="fit-content"
          sortable
          body={shooter => (
            <ShooterCell
              sport={sportForDivision(division)}
              data={shooter}
              onClick={() => onShooterSelection?.(shooter.memberNumber)}
            />
          )}
        />
        <Column field="elo" header="ELO" sortable body={renderHFOrNA} />
        <Column
          field="reclassificationsRecPercentUncappedCurrent"
          header="Rec. Uncapped"
          headerTooltip="Like Recommended, but Scores aren't capped at 100%"
          headerTooltipOptions={headerTooltipOptions}
          sortable
          body={renderPercent}
        />
        <Column
          field="reclassificationsRecPercentCurrent"
          header={isHFU ? "Percent" : "Rec."}
          headerTooltip="Recommended classification percent of this shooter, using best 6 out of most recent 10 scores and recommended HHFs for classifiers."
          headerTooltipOptions={headerTooltipOptions}
          sortable
          body={renderPercent}
        />
        <Column
          field="reclassificationsSoftPercentCurrent"
          header="Rec. Soft"
          headerTooltip="Like Recommended, but D-flags still work"
          headerTooltipOptions={headerTooltipOptions}
          sortable
          body={renderPercent}
        />
        <Column
          field="reclassificationsRecHHFOnlyPercentCurrent"
          header="Rec.HHFOnly"
          headerTooltip="Like HQ (BCD-flags on), but using RecHHFs"
          headerTooltipOptions={headerTooltipOptions}
          sortable
          body={renderPercent}
        />
        <Column
          hidden={isHFU}
          field="reclassificationsCurPercentCurrent"
          header="HQ"
          // header="Cur."
          headerTooltip="Current HHF classification percent of this shooter, if all their classifier scores would use the most recent HHFs. Major Matches results stay the same."
          headerTooltipOptions={headerTooltipOptions}
          sortable
          body={renderPercent}
        />
        {/*<Column
          hidden={isHFU}
          field="current"
          header="HQ"
          sortable
          body={renderPercent}
        />*/}
        <Column
          field="age"
          header="Age"
          body={c => (c.age ? `${(c.age || 0).toFixed(1)}mo` : "—")}
          sortable
          headerTooltip="Average age in months of Y-flagged scores (classifiers & majors) of this shooter"
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column
          body={c => (
            <ReportDialog.Button onClick={() => reportDialogRef.current.startReport(c)} />
          )}
        />
      </DataTable>
    </>
  );
};

export default ShootersTable;
