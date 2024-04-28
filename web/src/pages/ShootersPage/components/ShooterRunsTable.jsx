import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { headerTooltipOptions, renderPercent } from "../../../components/Table";
import ClassifierCell from "../../../components/ClassifierCell";

// TODO: historical HHF, percentile
const ShooterRunsTable = ({
  classifiers,
  classifiersTotal,
  classifiersPage,
  onClassifierSelection,
  onClubSelection,
  loading,
}) => (
  <DataTable
    className="sm:text-sm"
    sortOrder={-1}
    sortField="sdUnix"
    loading={loading}
    stripedRows
    /*lazy*/
    value={(classifiers ?? []).map((c) => ({
      ...c,
      sdUnix: new Date(c.sd).getTime(),
    }))}
    tableStyle={{ minWidth: "50rem" }}
    /*
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
    */
  >
    {/*    <Column field="sd" header="Date" />*/}
    <Column
      field="sdUnix"
      header="Date"
      sortable
      body={(run) => new Date(run.sd).toLocaleDateString("en-us", { timeZone: "UTC" })}
    />
    <Column
      field="classifier"
      header="Classifier"
      sortable
      bodyStyle={{ width: "12rem" }}
      body={(run) =>
        run.classifier ? (
          <ClassifierCell
            {...run.classifierInfo}
            onClick={() => onClassifierSelection?.(run.classifier)}
          />
        ) : (
          run.club_name
        )
      }
    />
    <Column field="clubid" header="Club" sortable showFilterMenu={false} />
    <Column field="hf" header="HF" sortable />
    <Column
      body={renderPercent}
      field="percent"
      header="Percent"
      sortable
      headerTooltip="Classifier percentage for this score during the time that it was processed by USPSA. Maxes out at 100%."
      headerTooltipOptions={headerTooltipOptions}
    />
    <Column
      body={renderPercent}
      field="recPercent"
      header="Rec. Percent"
      sortable
      headerTooltip="Recommended classifier percentage for this score. "
      headerTooltipOptions={headerTooltipOptions}
    />
    <Column
      body={renderPercent}
      field="curPercent"
      header="Current Percent"
      sortable
      headerTooltip="What classifier percentage this score would've earned if it was submitted today, with Current HHFs."
      headerTooltipOptions={headerTooltipOptions}
    />
    <Column
      body={renderPercent}
      field="percentMinusCurPercent"
      header="Percent Change"
      sortable
      headerTooltip="Difference between calculated percent when run was submitted and what it would've been with current High Hit-Factor. \n Positive values mean classifier became harder, negative - easier."
      headerTooltipOptions={headerTooltipOptions}
    />
    <Column field="code" header="Flag" sortable />
    <Column field="source" header="Source" sortable />
    {/* TODO: <Column field="percentile" header="Percentile" sortable={false} /> */}
  </DataTable>
);

export default ShooterRunsTable;
