import { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import {
  headerTooltipOptions,
  renderClubIdMatchLink,
  renderHFOrNA,
  renderPercent,
} from "../../../components/Table";
import ClassifierCell from "../../../components/ClassifierCell";
import ReportDialog from "../../../components/ReportDialog";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import ClassifierDropdown from "../../../components/ClassifierDropdown";
import { useDebouncedCallback } from "use-debounce";

const HFEdit = ({ value: valueProp, updateWhatIfs, id }) => {
  const [value, setValue] = useState(valueProp || 0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current.getInput()) {
      setValue(valueProp);
    }
  }, [valueProp]);

  const update = useDebouncedCallback(updateWhatIfs, 500);

  return (
    <InputNumber
      ref={inputRef}
      inputMode="decimal"
      className="max-w-full text-base"
      inputClassName="max-w-full py-2 md:py-3"
      placeholder="HitFactor"
      minFractionDigits={0}
      maxFractionDigits={4}
      value={value}
      onChange={({ value: newValue }) => {
        setValue(newValue);
        update(id, { hf: newValue }, true);
      }}
    />
  );
};

const ShooterRunsTable = ({
  classifiers,
  classifiersTotal,
  classifiersPage,
  onClassifierSelection,
  onClubSelection,
  loading,
  updateWhatIfs,
  whatIf,
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
          body={(run) => {
            if (!run.whatIf) {
              return new Date(run.sd).toLocaleDateString("en-us", { timeZone: "UTC" });
            }

            return (
              <>
                What If
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={run.sd.split("T")[0]}
                  onChange={({ target: { value } }) =>
                    updateWhatIfs(run._id, { sd: new Date(value).toISOString() })
                  }
                />
              </>
            );
          }}
        />
        <Column
          field="classifier"
          header="Classifier"
          sortable
          bodyStyle={{ width: "12rem" }}
          body={(c) =>
            c.whatIf ? (
              <ClassifierDropdown
                value={c.classifier}
                onChange={(classifier) => updateWhatIfs(c._id, { classifier })}
              />
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
              return <HFEdit id={c._id} value={c.hf} updateWhatIfs={updateWhatIfs} />;
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
        <Column
          field="clubid"
          header="Club"
          sortable
          body={renderClubIdMatchLink}
          showFilterMenu={false}
        />
        <Column field="source" header="Source" sortable />
        <Column
          body={(c) =>
            !c.whatIf && !whatIf ? (
              <ReportDialog.Button
                onClick={() => reportDialogRef.current.startReport(c)}
              />
            ) : (
              <Button
                icon="pi pi-trash text-xs md:text-base text-red-400"
                size="small"
                style={{ width: "1em" }}
                onClick={() => updateWhatIfs(c._id, { delete: true }, true)}
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
