import _ from "lodash";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import ShooterChart from "../../../components/chart/ShooterChart";

export const ShooterInfoTable = ({ division, memberNumber, ...info }) => (
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
        <ShooterChart division={division} memberNumber={memberNumber} />
      )}
    />
    <Column
      field="test2"
      header="Shooter Info"
      bodyStyle={{ padding: 0, maxHeight: "26rem" }}
      body={() => (
        <div
          className="h-26 w-full"
          style={{ overflowY: "scroll", maxHeight: "26rem" }}
        >
          <DataTable showHeaders={false} stripedRows value={[]}>
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

export default ShooterInfoTable;
