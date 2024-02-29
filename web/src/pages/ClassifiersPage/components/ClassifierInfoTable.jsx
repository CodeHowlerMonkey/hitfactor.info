import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import ScoresChart from "../../../components/chart/ScoresChart";
import { Tooltip } from "primereact/tooltip";

export const ClassifierInfoTable = ({
  division,
  classifier,
  hhf,
  recommendedHHF1,
  recommendedHHF5,
  recommendedHHF15,
  ...info
}) => (
  <DataTable
    scrollable={false}
    style={{ height: "100%" }}
    tableStyle={{ height: "100%" }}
    value={[{ test: 1, test2: 2, test3: 3 }]}
  >
    <Column
      field="test"
      header="Scores Distribution"
      bodyStyle={{ position: "relative", padding: 0, width: "46%" }}
      body={() => (
        <ScoresChart
          division={division}
          classifier={classifier}
          hhf={hhf}
          recommendedHHF1={recommendedHHF1}
          recommendedHHF5={recommendedHHF5}
          recommendedHHF15={recommendedHHF15}
        />
      )}
    />
    <Column
      field="test"
      header="WSB"
      bodyStyle={{ width: "27%", minWidth: "320px" }}
      body={() => (
        <div
          onClick={() => window.open(`/wsb/${classifier}`, "_blank")}
          style={{
            cursor: "pointer",
            width: "100%",
            height: "100%",
            minHeight: "26rem",
            backgroundColor: "clear",
            backgroundImage: `url(/wsb/${classifier}?preview=1)`,
            backgroundSize: "auto 100%",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "top center",
          }}
        />
      )}
    />
    <Column
      field="test2"
      header="Historical HHFs"
      bodyStyle={{ padding: 0, maxHeight: "26rem" }}
      body={() => (
        <div
          className="h-26 w-full"
          style={{ overflowY: "scroll", maxHeight: "26rem" }}
        >
          <DataTable
            showHeaders={false}
            stripedRows
            value={[
              ...(info?.hhfs || []),
              {
                label: "r1HHF",
                tooltip:
                  "Recommended HHF based on calibration around distribution of GM-shooters in the division (should be around 1% of the shooters)",
                hhf: recommendedHHF1,
              },
              {
                label: "r5HHF",
                tooltip:
                  "Recommended HHF based on calibration around distribution of M-shooters in the division (should be around 5% of the shooters)",
                hhf: recommendedHHF5,
              },
              {
                label: "r15HHF",
                tooltip:
                  "Recommended HHF based on calibration around distribution of A-shooters in the division (should be around 15% of the shooters)",
                hhf: recommendedHHF15,
              },
            ]}
          >
            <Column field="hhf" />
            <Column
              field="date"
              tooltip={(c) => c.tooltip}
              body={(c) =>
                c.label ? (
                  <div
                    className="recommendedHHFExplanation"
                    data-pr-tooltip={c.tooltip}
                  >
                    {c.label}
                    <i
                      style={{
                        fontSize: "12px",
                        margin: "6px",
                        verticalAlign: "middle",
                        position: "relative",
                        bottom: "2px",
                      }}
                      className="pi pi-info-circle"
                    />
                  </div>
                ) : (
                  new Date(c.date).toLocaleDateString()
                )
              }
            />
          </DataTable>
          <Tooltip target=".recommendedHHFExplanation" />
        </div>
      )}
    />
  </DataTable>
);

export default ClassifierInfoTable;
