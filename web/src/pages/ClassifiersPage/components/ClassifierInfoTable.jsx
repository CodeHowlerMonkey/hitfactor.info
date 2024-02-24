import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import ScoresChart from "../../../components/chart/ScoresChart";

export const ClassifierInfoTable = ({ division, classifier, hhf, ...info }) => (
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
        <ScoresChart division={division} classifier={classifier} hhf={hhf} />
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
          <DataTable showHeaders={false} stripedRows value={info.hhfs}>
            <Column field="hhf" />
            <Column
              field="date"
              body={(c) => new Date(c.date).toLocaleDateString()}
            />
          </DataTable>
        </div>
      )}
    />
  </DataTable>
);

export default ClassifierInfoTable;
