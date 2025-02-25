import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputNumber } from "primereact/inputnumber";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import ClassifierCell from "../../../components/ClassifierCell";
import ClassifierDropdown from "../../../components/ClassifierDropdown";
import ReportDialog from "../../../components/ReportDialog";
import {
  headerTooltipOptions,
  renderHFOrNA,
  renderPercent,
  clubMatchColumn,
} from "../../../components/Table";
import { useIsHFU } from "../../../utils/useIsHFU";
import { useIsSCSA } from "../../../utils/useIsSCSA";

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
  onClassifierSelection,
  loading,
  updateWhatIfs,
  whatIf,
}) => {
  const isHFU = useIsHFU();
  const isSCSA = useIsSCSA();
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
        /* lazy */
        value={(classifiers ?? []).map(c => ({
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
        {/*    <Column field="sd" header="Date" /> */}
        <Column
          field="sdUnix"
          header="Date"
          sortable
          body={run => {
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
          body={c =>
            c.whatIf ? (
              <ClassifierDropdown
                value={c.classifier}
                onChange={classifier => updateWhatIfs(c._id, { classifier })}
              />
            ) : (
              <ClassifierCell
                division={c.division}
                info={c.classifierInfo}
                fallback={c.club_name}
                onClick={() => onClassifierSelection?.(c.classifier)}
              />
            )
          }
        />
        <Column
          field="hf"
          header={isSCSA ? "Time" : "HF"}
          style={{ maxWidth: "9.3em" }}
          sortable
          body={(c, { field }) => {
            if (isSCSA) {
              const time = c[field];
              return <span>{(time || 0).toFixed(2)}</span>;
            }
            if (c.whatIf) {
              return <HFEdit id={c._id} value={c.hf} updateWhatIfs={updateWhatIfs} />;
            }
            const hf = renderHFOrNA(c, { field });
            const originalHF = renderHFOrNA(c, { field: "originalHF" });
            const title = originalHF !== "-" ? `Original HF: ${originalHF}` : undefined;
            return <span title={title}>{hf}</span>;
          }}
        />
        <Column
          body={renderPercent}
          field="recPercent"
          header={isHFU ? "Percent" : "Rec. %"}
          sortable
          headerTooltip="Recommended classifier percentage for this score."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column
          hidden={isHFU}
          body={renderPercent}
          field="curPercent"
          header="HQ %"
          sortable
          headerTooltip="What classifier percentage this score would've earned if it was submitted today, with Current HHFs."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column
          hidden
          body={c => {
            if (c.percent > 0) {
              return renderPercent(c, { field: "percent" });
            }

            return renderPercent(c, { field: "curPercent" });
          }}
          field="percent"
          header="Percent"
          sortable
          headerTooltip="Classifier percentage for this score during the time that it was processed by USPSA. Maxes out at 100%."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column
          hidden
          body={renderPercent}
          field="percentMinusCurPercent"
          header="Percent Change"
          sortable
          headerTooltip="Difference between calculated percent when run was submitted and what it would've been with current High Hit-Factor. \n Positive values mean classifier became harder, negative - easier."
          headerTooltipOptions={headerTooltipOptions}
        />
        <Column hidden field="code" header="Flag" sortable />
        <Column {...clubMatchColumn} />
        <Column hidden={isHFU} field="source" header="Source" sortable />
        <Column
          body={c =>
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
