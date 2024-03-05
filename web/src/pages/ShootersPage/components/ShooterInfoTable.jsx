import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import ShooterChart from "../../../components/chart/ShooterChart";

const tableNameForDiv = {
  opn: "Open",
  ltd: "Lim",
  l10: "L10",
  prod: "Prod",
  rev: "Revo",
  ss: "SS",
  co: "CO",
  pcc: "PCC",
  lo: "LO",
};
const cardRow = ({ classes, highs, currents, ages }, div) => ({
  k: tableNameForDiv[div],
  v1: classes[div],
  v2: (highs[div] ?? 0).toFixed(2) + "%",
  v3: (currents[div] ?? 0).toFixed(2) + "%",
  v4: (ages[div] ?? -1).toFixed(1) + "mo",
});

export const ShooterInfoTable = ({ info }) => {
  const loading = !info?.data?.member_id;

  return (
    <DataTable
      loading={loading}
      scrollable={false}
      style={{ height: "100%" }}
      tableStyle={{ height: "100%" }}
      value={[{ noop: 1 }]}
    >
      <Column
        field="test"
        header="Scores Distribution"
        bodyStyle={{ position: "relative", padding: 0, width: "46%" }}
        body={() => (
          <ShooterChart
            division={info.division}
            memberNumber={info.memberNumber}
          />
        )}
      />
      <Column
        field="test2"
        header="Shooter Info"
        bodyStyle={{ padding: 0 }}
        body={() => (
          <div className="h-full w-full" style={{ overflowY: "scroll" }}>
            <DataTable
              size="small"
              showHeaders={false}
              value={
                loading
                  ? []
                  : [
                      { k: "ID", v: info?.data?.member_id },
                      { k: "Number", v: info?.memberNumber },
                      { k: "First Name", v: info?.data?.first_name },
                      { k: "Middle Name", v: info?.data?.middle_name },
                      { k: "Last Name", v: info?.data?.last_name },
                      { k: "Division", v: tableNameForDiv[info?.division] },
                      { k: "Class", v: info?.class },
                      {
                        k: "High Rank / Perc",
                        v: `${info?.highRank} / ${info?.highPercentile}%`,
                      },
                      {
                        k: "Cur Rank / Perc",
                        v: `${info?.currentRank} / ${info?.currentPercentile}%`,
                      },
                    ]
              }
            >
              <Column field="k" />
              <Column field="v" />
            </DataTable>
          </div>
        )}
      />
      <Column
        field="test2"
        header="Card"
        body={() => (
          <div className="h-full w-full" style={{ overflowY: "scroll" }}>
            <DataTable
              size="small"
              stripedRows
              value={
                loading
                  ? []
                  : [
                      cardRow(info, "opn"),
                      cardRow(info, "ltd"),
                      cardRow(info, "l10"),
                      cardRow(info, "prod"),
                      cardRow(info, "rev"),
                      cardRow(info, "ss"),
                      cardRow(info, "co"),
                      cardRow(info, "pcc"),
                      cardRow(info, "lo"),
                    ]
              }
            >
              <Column field="k" header="Div" />
              <Column field="v1" header="Class" />
              <Column field="v2" header="High %" />
              <Column field="v3" header="Cur %" />
              <Column field="v4" header="Age" />
            </DataTable>
          </div>
        )}
      />
    </DataTable>
  );
};
export default ShooterInfoTable;
