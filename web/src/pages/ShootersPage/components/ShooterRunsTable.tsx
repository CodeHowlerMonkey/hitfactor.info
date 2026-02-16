import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputNumber } from "primereact/inputnumber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { useDebouncedCallback } from "use-debounce";

import {
  ScoresMode,
  ScoreSourceClassifier,
  ScoreSourceMajor,
} from "@data/types/ScoresModes";
import { stageTargetsHitsText } from "@shared/utils/hitfactor";

import ClassifierCell from "../../../components/ClassifierCell";
import ClassifierDropdown from "../../../components/ClassifierDropdown";
import ReportDialog from "../../../components/ReportDialog";
import {
  headerTooltipOptions,
  renderHFOrNA,
  renderPercent,
  clubMatchColumn,
  StageTime,
} from "../../../components/Table";

const HFEdit = ({ value: valueProp, updateWhatIfs, id }) => {
  const [value, setValue] = useState(valueProp || 0);
  const inputRef = useRef<InputNumber>(null);

  useEffect(() => {
    if (document.activeElement !== (inputRef.current?.getInput() as unknown as Element)) {
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

interface ShooterRunsTableProps {
  classifiers: Record<string, string | number | boolean | Date>[];
  onClassifierSelection: (classifier: string) => void;
  loading: boolean;
  updateWhatIfs: (
    id: string,
    changes: Record<string, string | number | boolean>,
    noDebounce?: boolean,
  ) => void;
  whatIf: boolean;
  hidden: boolean;
  scoresMode: ScoresMode;
}

const ShooterRunsTable = ({
  classifiers: scores,
  onClassifierSelection,
  loading,
  updateWhatIfs,
  whatIf,
  hidden,
  scoresMode,
}: ShooterRunsTableProps) => {
  const reportDialogRef = useRef<ReportDialog>(null);
  const data = useMemo(() => {
    const allScores = scores ?? [];
    const filtered =
      scoresMode === "combined"
        ? allScores
        : allScores.filter(c => {
            if (scoresMode === "classifiers") {
              return c.source === ScoreSourceClassifier;
            } else if (scoresMode === "majors") {
              return c.source === ScoreSourceMajor;
            }
          });
    return filtered.map(c => ({
      ...c,
      sdUnix: new Date(c.sd as string | Date).getTime(),
      curPercent: c.source === "Major Match" ? -1 : c.curPercent,
      oldPercent: c.source === "Major Match" ? -1 : c.oldPercent,
    }));
  }, [scores, scoresMode]);

  if (hidden) {
    return null;
  }
  return (
    <>
      <ReportDialog type="Score" ref={reportDialogRef} />
      <DataTable
        className="text-xs md:text-base"
        sortOrder={-1}
        sortField="sdUnix"
        loading={loading}
        stripedRows
        value={data}
        tableStyle={{ minWidth: "50rem" }}
      >
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
                fallback={c.matchName || c.club_name}
                onClick={() => onClassifierSelection?.(c.classifier)}
              />
            )
          }
        />
        <Column
          body={renderPercent}
          field="recPercent"
          header="Percent"
          sortable
          headerTooltip="Recommended classifier percentage for this score."
          headerTooltipOptions={headerTooltipOptions}
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
            const hf = renderHFOrNA(c, { field });
            const originalHF = renderHFOrNA(c, { field: "originalHF" });
            const title = originalHF !== "-" ? `Original HF: ${originalHF}` : undefined;
            return <span title={title}>{hf}</span>;
          }}
        />
        {/* TODO: migrate stageTimeSecs to Number and make it sortable */}
        <Column field="stageTimeSecs" header="Time" body={c => <StageTime score={c} />} />
        <Column
          field="hits"
          header="Hits"
          body={c => stageTargetsHitsText(c.targetHits) || "—"}
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
        <Column field="source" header="Source" sortable />
        <Column
          body={c =>
            !c.whatIf && !whatIf ? (
              <ReportDialog.Button
                onClick={() => reportDialogRef.current?.startReport(c)}
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
      <ReactTooltip id="strings-tooltip" />
    </>
  );
};

export default ShooterRunsTable;
