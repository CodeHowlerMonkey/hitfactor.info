import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import {
  hfuDivisionsShortNames,
  nameForDivision,
  sportForDivision,
  uspsaDivShortNames,
} from "../../../../../api/src/dataUtil/divisions";
import ShooterChart from "../../../components/chart/ShooterChart";
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

const percentValueOrEmpty = value =>
  toFixedWithSuffixValueOrPlaceholder(value, 2, "%", "");

const cardRow = (classificationByDivision, div) => {
  const {
    hqClass,
    current,
    age,
    reclassificationsCurPercentCurrent,
    reclassificationsCurPercentClass,
    reclassificationsRecPercentClass,
    reclassificationsRecPercentCurrent,
  } = classificationByDivision?.[div] || {
    hqClass: "U",
    current: 0,
    age: null,
    reclassificationsCurPercentCurrent: 0,
    reclassificationsCurPercentClass: "U",
    reclassificationsRecPercentCurrent: 0,
    reclassificationsRecPercentClass: "U",
  };
  return {
    division: tableNameForDiv[div],
    hq: [hqClass, percentValueOrEmpty(current)].filter(Boolean).join(" / "),
    curHHF: [
      reclassificationsCurPercentClass,
      percentValueOrEmpty(reclassificationsCurPercentCurrent),
    ]
      .filter(Boolean)
      .join(" / "),
    rec: [
      reclassificationsRecPercentClass,
      percentValueOrEmpty(reclassificationsRecPercentCurrent),
    ]
      .filter(Boolean)
      .join(" / "),
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
      <div className="flex-grow-1 md:w-min md:max-w-min" />
      {!isSCSA && (
        <div className="w-12 h-32rem">
          <h4 className="mb-0 md:text-lg lg:text-xl w-max">Scores Distribution</h4>
          <div className="relative h-32rem bg-primary-reverse">
            <ShooterChart division={info.division} memberNumber={info.memberNumber} />
          </div>
        </div>
      )}
    </div>
  );
};
export default ShooterInfoTable;
