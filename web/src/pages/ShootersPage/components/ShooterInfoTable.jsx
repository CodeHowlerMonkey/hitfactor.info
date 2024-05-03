import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import ShooterChart from "../../../components/chart/ShooterChart";
import { useState } from "react";
import { ShooterProgressChart } from "../../../components/chart/ShooterProgressChart";

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

const toFixedWithSuffixValueOrPlaceholder = (value, length, suffix, empty = "—") => {
  if (!value) {
    return empty;
  }

  return value.toFixed(length) + suffix;
};

const percentValueOrEmpty = (value) =>
  toFixedWithSuffixValueOrPlaceholder(value, 2, "%", "");

const cardRow = ({ classes, currents, ages, reclassifications }, div) => ({
  division: tableNameForDiv[div],
  hq: [classes[div], percentValueOrEmpty(currents[div])].filter(Boolean).join(" / "),
  curHHF: [
    reclassifications.curPercent?.classes?.[div],
    percentValueOrEmpty(reclassifications?.curPercent?.currents?.[div]),
  ]
    .filter(Boolean)
    .join(" / "),
  rec: [
    reclassifications.recPercent?.classes?.[div],
    percentValueOrEmpty(reclassifications?.recPercent?.currents?.[div]),
  ]
    .filter(Boolean)
    .join(" / "),
  age: toFixedWithSuffixValueOrPlaceholder(ages[div], 1, "mo"),
});

const dateValue = (value) =>
  !value ? "" : new Date(value).toLocaleDateString("en-us", { timeZone: "UTC" });

export const ShooterInfoTable = ({ info }) => {
  const loading = !info?.data?.member_id;
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div classname="h-full">
      <DataTable
        size="small"
        showHeaders={false}
        value={
          loading
            ? []
            : [
                {
                  k: "ID",
                  v: info?.data?.member_id,
                },
                {
                  k: "Number",
                  v: info?.memberNumber,
                },
                {
                  k: "Joined",
                  v: dateValue(info?.data?.joined_date),
                },
                {
                  k: "Expires",
                  v: dateValue(info?.data?.expiration_date),
                },
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
      <h3 className="m-4 mb-2">Classification Progress</h3>
      <ShooterProgressChart division={info.division} memberNumber={info.memberNumber} />
      <h3 className="m-4 mb-2">Scores Distribution</h3>
      <div className="relative h-32rem bg-primary-reverse">
        <ShooterChart division={info.division} memberNumber={info.memberNumber} />
      </div>
    </div>
  );
};
export default ShooterInfoTable;
