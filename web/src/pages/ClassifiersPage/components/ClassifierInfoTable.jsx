import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tooltip } from "primereact/tooltip";

import { sportForDivision } from "../../../../../shared/constants/divisions";
import { ScoresChart } from "../../../components/chart/ScoresChart";

export const ClassifierInfoTable = ({
  division,
  classifier,
  hhf,
  recHHF,
  curHHF,
  ...info
}) => (
  <div className="flex flex-wrap gap-2 justify-content-around">
    <div
      className="flex-grow-1 flex flex-column sm:max-w-20rem md:max-w-30rem"
      style={{ minWidth: "16em", height: "28em" }}
    >
      <h4 className="md:text-lg">WSB</h4>
      <div
        onClick={() => window.open(`/wsb/${classifier}`, "_blank")}
        style={{
          flexGrow: 1,
          cursor: "pointer",
          height: "20em",
          backgroundColor: "clear",
          backgroundImage: `url(/wsb/${classifier}?preview=1)`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "top center",
        }}
      />
    </div>

    {sportForDivision(division) === "uspsa" && (
      <div className="md:w-min md:max-w-min" style={{ maxHeight: "28em" }}>
        <h4 className="md:text-lg">Historical HHFs</h4>
        <div style={{ overflowY: "scroll", maxHeight: "100%" }}>
          <DataTable
            className="text-sm md:text-base"
            size="small"
            showHeaders={false}
            stripedRows
            value={[
              ...(info?.hhfs || []),
              ...(!curHHF
                ? []
                : [
                    {
                      label: "Cur. HHF",
                      tooltip: "Current HHF",
                      hhf: curHHF.toFixed(4),
                    },
                  ]),
              ...(!recHHF
                ? []
                : [
                    {
                      label: "Rec. HHF",
                      tooltip: "Recommended HHF",
                      hhf: recHHF.toFixed(4),
                    },
                  ]),
            ]}
          >
            <Column field="hhf" />
            <Column
              field="date"
              tooltip={c => c.tooltip}
              body={c =>
                c.label ? (
                  <div className="recommendedHHFExplanation" data-pr-tooltip={c.tooltip}>
                    {c.label}
                    <i
                      style={{
                        fontSize: "0.85em",
                        margin: "0.4em",
                        verticalAlign: "middle",
                        position: "relative",
                        bottom: "0.14em",
                      }}
                      className="pi pi-info-circle"
                    />
                  </div>
                ) : (
                  new Date(c.date).toLocaleDateString("en-us", { timeZone: "UTC" })
                )
              }
            />
          </DataTable>
          <Tooltip target=".recommendedHHFExplanation" />
        </div>
      </div>
    )}

    <div
      className="flex-grow-1 flex flex-column"
      style={{ minWidth: "20em", height: "28em" }}
    >
      <h4 className="md:text-lg">Scores Distribution</h4>
      <div className="h-full w-auto flex-grow-1 bg-primary-reverse">
        <ScoresChart
          totalScores={info.totalScores}
          division={division}
          classifier={classifier}
          hhf={hhf}
          recHHF={recHHF}
        />
      </div>
    </div>
  </div>
);

export default ClassifierInfoTable;
