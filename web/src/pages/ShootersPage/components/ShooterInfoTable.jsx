import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import ShooterChart from "../../../components/chart/ShooterChart";
import { ShooterProgressChart } from "../../../components/chart/ShooterProgressChart";
import { divShortToLong } from "../../../../../api/src/dataUtil/divisions";

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
  hq: [classes?.[div], percentValueOrEmpty(currents?.[div])].filter(Boolean).join(" / "),
  curHHF: [
    reclassifications?.curPercent?.classes?.[div],
    percentValueOrEmpty(reclassifications?.curPercent?.currents?.[div]),
  ]
    .filter(Boolean)
    .join(" / "),
  rec: [
    reclassifications?.recPercent?.classes?.[div],
    percentValueOrEmpty(reclassifications?.recPercent?.currents?.[div]),
  ]
    .filter(Boolean)
    .join(" / "),
  age: toFixedWithSuffixValueOrPlaceholder(ages?.[div], 1, "mo"),
});

const dateValue = (value) =>
  !value ? "" : new Date(value).toLocaleDateString("en-us", { timeZone: "UTC" });

export const ShooterInfoTable = ({ info, division, memberNumber, loading }) => {
  const { name } = info;

  return (
    <div className="h-full flex flex-wrap">
      <div className="flex-grow-1 md:w-min md:max-w-min">
        <h4 className="hidden mx-3 md:block md:text-lg lg:text-xl w-max">
          {memberNumber} - {name} - {divShortToLong[division]}
        </h4>
        <DataTable
          loading={loading}
          className="text-xs md:text-base"
          size="small"
          showHeaders={false}
          value={
            loading || !info
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
          className="text-xs md:text-base"
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
      <div className="w-12 md:w-5 flex-grow-1 flex flex-column">
        <h4 className="md:text-center mb-0 md:text-lg lg:text-xl">
          Classification Progress
        </h4>
        <ShooterProgressChart division={info.division} memberNumber={info.memberNumber} />
      </div>

      <div className="w-12 h-32rem">
        <h4 className="mb-0 md:text-lg lg:text-xl w-max">Scores Distribution</h4>
        <div className="relative h-32rem bg-primary-reverse">
          <ShooterChart division={info.division} memberNumber={info.memberNumber} />
        </div>
      </div>
    </div>
  );
};
export default ShooterInfoTable;
