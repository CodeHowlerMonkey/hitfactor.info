import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import ShooterChart from "../../../components/chart/ShooterChart";
import { classForPercent } from "../../../../../shared/utils/classification";

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

const toFixedWithSuffixValueOrPlaceholder = (
  value,
  length,
  suffix,
  empty = "—"
) => {
  if (!value) {
    return empty;
  }

  return value.toFixed(length) + suffix;
};

const percentValueOrEmpty = (value) =>
  toFixedWithSuffixValueOrPlaceholder(value, 2, "%", "");

const cardRow = (
  { classes, highs, currents, ages, reclassifications },
  div
) => ({
  division: tableNameForDiv[div],
  hq: [classes[div], percentValueOrEmpty(currents[div])]
    .filter(Boolean)
    .join(" / "),
  curHHF: [
    reclassifications.curPercent.classes[div],
    percentValueOrEmpty(reclassifications?.curPercent?.currents?.[div]),
  ]
    .filter(Boolean)
    .join(" / "),
  rec: [
    reclassifications.recPercent.classes[div],
    percentValueOrEmpty(reclassifications?.recPercent?.currents?.[div]),
  ]
    .filter(Boolean)
    .join(" / "),
  age: toFixedWithSuffixValueOrPlaceholder(ages[div], 1, "mo"),
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
        bodyStyle={{
          position: "relative",
          padding: 0,
          minWidth: "36rem",
          maxWidth: "58rem",
        }}
        body={() => (
          <ShooterChart
            division={info.division}
            memberNumber={info.memberNumber}
          />
        )}
      />
      <Column
        align="center"
        maxWidth="24rem"
        field="test2"
        header="Shooter Info / Card"
        body={() => (
          <div
            className="h-full w-24rem"
            style={{ marginLeft: "auto", overflowY: "scroll" }}
          >
            <DataTable
              tableStyle={{ maxWidth: "100%", margin: " 0 auto" }}
              size="small"
              showHeaders={false}
              value={
                loading
                  ? []
                  : [
                      { k: "ID", v: info?.data?.member_id },
                      { k: "Number", v: info?.memberNumber },
                    ]
              }
            >
              <Column field="k" />
              <Column field="v" align="right" />
            </DataTable>
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
              <Column field="division" header="Div" />
              <Column field="rec" header="Rec." />
              <Column field="curHHF" header="Cur.HHF" />
              <Column field="hq" header="HQ" />
              <Column field="age" header="Age" />
            </DataTable>
          </div>
        )}
      />
    </DataTable>
  );
};
export default ShooterInfoTable;
