import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import {
  hfuDivisionsShortNames,
  nameForDivision,
  sportForDivision,
  uspsaDivShortNames,
} from "../../../../../api/src/dataUtil/divisions";
import { classForPercent } from "../../../../../shared/utils/classification";
import ShooterChart from "../../../components/chart/ShooterChart";
import { ShooterProgressChart } from "../../../components/chart/ShooterProgressChart";

const percentValueOrEmpty = value =>
  toFixedWithSuffixValueOrPlaceholder(value, 2, "%", "");

const renderClassification = (c, { field }) => {
  const { high, cur } = c[field];

  const classificationString = [
    classForPercent(high) ?? "U",
    percentValueOrEmpty(high),
    percentValueOrEmpty(cur),
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <>
      <div className="md:hidden">{classificationString}</div>
      <div className="hidden md:block white-space-nowrap">{classificationString}</div>
    </>
  );
};

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

  comp: "Comp",
  opt: "Optics",
  irn: "Irons",
  car: "Carbine",
};

const toFixedWithSuffixValueOrPlaceholder = (value, length, suffix, empty = "—") => {
  if (!value) {
    return empty;
  }

  return value.toFixed(length) + suffix;
};

const cardRow = (classificationByDivision, div) => {
  const {
    age,
    reclassificationsCurPercentCurrent,
    reclassificationsCurPercentHigh,
    reclassificationsRecPercentUncappedCurrent,
    reclassificationsRecPercentUncappedHigh,
  } = classificationByDivision?.[div] || {
    hqClass: "U",
    current: 0,
    age: null,
    reclassificationsCurPercentCurrent: 0,
    reclassificationsRecPercentCurrent: 0,
  };
  return {
    division: tableNameForDiv[div],
    curHHF: {
      high: reclassificationsCurPercentHigh,
      cur: reclassificationsCurPercentCurrent,
    },
    rec: {
      high: reclassificationsRecPercentUncappedHigh,
      cur: reclassificationsRecPercentUncappedCurrent,
    },
    age: toFixedWithSuffixValueOrPlaceholder(age, 1, "mo"),
  };
};

const dateValue = value =>
  !value ? "" : new Date(value).toLocaleDateString("en-us", { timeZone: "UTC" });

export const ShooterInfoTable = ({ info, division, memberNumber, loading }) => {
  const { name } = info;
  const sport = sportForDivision(division);
  const isHFU = sport === "hfu";
  const divisions = isHFU ? hfuDivisionsShortNames : uspsaDivShortNames;
  const isUspsa = sport === "uspsa";
  const isSCSA = sport === "scsa";

  return (
    <div className="h-full flex flex-wrap">
      <div className="flex-grow-1 md:w-min md:max-w-min">
        <h4 className="hidden mx-3 md:block md:text-lg lg:text-xl w-max">
          {[memberNumber, name, nameForDivision(division)].filter(Boolean).join(" - ")}
        </h4>
        {isUspsa && (
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
        )}
        {(isUspsa || isHFU) && (
          <DataTable
            className="text-xs md:text-base"
            size="small"
            stripedRows
            value={
              loading || !info?.classificationByDivision
                ? []
                : divisions.map(d => cardRow(info.classificationByDivision, d))
            }
          >
            <Column field="division" header={isHFU ? "Division" : "Div"} />
            <Column
              align="center"
              field="rec"
              header={isHFU ? "Percent" : "Rec."}
              body={renderClassification}
            />
            <Column
              align="center"
              field="curHHF"
              header="HQ"
              hidden={isHFU}
              body={renderClassification}
            />
            <Column field="age" header="Age" style={{ widths: 128 }} align="right" />
          </DataTable>
        )}
      </div>
      {!isSCSA && (
        <>
          <div className="w-12 md:w-5 flex-grow-1 flex flex-column">
            <h4 className="md:text-center mb-0 md:text-lg lg:text-xl">
              Classification Progress
            </h4>
            <ShooterProgressChart
              division={info.division}
              memberNumber={info.memberNumber}
            />
          </div>

          <div className="w-12 h-32rem">
            <h4 className="mb-0 md:text-lg lg:text-xl w-max">Scores Distribution</h4>
            <div className="relative h-32rem bg-primary-reverse">
              <ShooterChart division={info.division} memberNumber={info.memberNumber} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default ShooterInfoTable;
