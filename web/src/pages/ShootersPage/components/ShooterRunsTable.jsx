import { useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import {
  headerTooltipOptions,
  renderHFOrNA,
  renderPercent,
} from "../../../components/Table";
import ClassifierCell from "../../../components/ClassifierCell";
import ReportDialog from "../../../components/ReportDialog";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import ClassifierDropdown from "../../../components/ClassifierDropdown";

const ShooterRunsTable = ({
  classifiers,
  classifiersTotal,
  classifiersPage,
  onClassifierSelection,
  onClubSelection,
  loading,
  updateWhatIfs,
}) => {
  const reportDialogRef = useRef(null);
  return (
    <>
      <ReportDialog type="Score" ref={reportDialogRef} />
      <DataTable
        className="text-xs md:text-base"
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
          body={(run) =>
            !run.whatIf
              ? new Date(run.sd).toLocaleDateString("en-us", { timeZone: "UTC" })
              : "What If"
          }
        />
        <Column
          field="classifier"
          header="Classifier"
          sortable
          bodyStyle={{ width: "12rem" }}
          body={(c) =>
            c.whatIf ? (
              <ClassifierDropdown onChange={(v) => console.log(v)} />
            ) : (
              <ClassifierCell
                info={c.classifierInfo}
                fallback={c.club_name}
                onClick={() => onClassifierSelection?.(c.classifier)}
              />
            )
          }
        />
        <Column
          field="hf"
          header="HF"
          style={{ maxWidth: "9.3em" }}
          sortable
          body={(c, { field }) => {
            if (c.whatIf) {
              return (
                <InputNumber
                  className="max-w-full"
                  inputClassName="max-w-full"
                  placeholder="HitFactor"
                  minFractionDigits={4}
                  maxFractionDigits={4}
                  onChange={({ value }) => {
                    updateWhatIfs(c.whatIf, { hf: value });
                  }}
                />
              );
            }
            return renderHFOrNA(c, { field });
          }}
        />
        <Column
          body={renderPercent}
          field="recPercent"
          header="Rec. %"
          sortable
          headerTooltip="Recommended classifier percentage for this score."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column
          body={renderPercent}
          field="curPercent"
          header="Cur. %"
          sortable
          headerTooltip="What classifier percentage this score would've earned if it was submitted today, with Current HHFs."
          headerTooltipOptions={headerTooltipOptions}
        />
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
          field="percentMinusCurPercent"
          header="Percent Change"
          sortable
          headerTooltip="Difference between calculated percent when run was submitted and what it would've been with current High Hit-Factor. \n Positive values mean classifier became harder, negative - easier."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column field="code" header="Flag" sortable />
        <Column field="clubid" header="Club" sortable showFilterMenu={false} />
        <Column field="source" header="Source" sortable />
        <Column
          body={(c) =>
            !c.whatIf ? (
              <ReportDialog.Button
                onClick={() => reportDialogRef.current.startReport(c)}
              />
            ) : (
              <Button
                icon="pi pi-trash text-xs md:text-base text-red-400"
                size="small"
                style={{ width: "1em" }}
                onClick={() => updateWhatIfs(c.whatIf, { delete: true })}
                text
              />
            )
          }
        />
        {/* TODO: <Column field="percentile" header="Percentile" sortable={false} /> */}
      </DataTable>
    </>
  );
};

export default ShooterRunsTable;
