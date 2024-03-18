import { lazy, loadJSON, processImport } from "../utils.js";
import {
  getShooterToCurPercentClassifications,
  getShooterToRecPercentClassifications,
} from "./classifiers.js";
import { divIdToShort } from "./divisions.js";

const memberIdToNumberMap = loadJSON("../../data/meta/memberIdToNumber.json");
const memberNumberFromMemberData = (memberData) => {
  try {
    const easy = memberData.member_number;
    if (!easy || easy.trim().toLowerCase() === "private") {
      return memberIdToNumberMap[String(memberData.member_id)];
    }
    return easy;
  } catch (err) {
    console.log(err);
  }

  return "BAD DATA";
};

const mapClassificationInfo = (
  c,
  reclassificationsByCurPercent,
  reclassificationsByRecPercent
) => {
  const memberNumber = memberNumberFromMemberData(c.member_data);
  return {
    data: c.member_data,
    memberNumber,
    name: [
      c.member_data.first_name,
      c.member_data.last_name,
      c.member_data.suffix,
    ]
      .filter(Boolean)
      .join(" "),
    classifications: c.classifications.reduce(
      (acc, c) => ({
        ...acc,
        [divIdToShort[c.division_id]]: c.class,
      }),
      {}
    ),
    high: c.classifications.reduce(
      (acc, c) => ({
        ...acc,
        [divIdToShort[c.division_id]]: Number(c.high_percent),
      }),
      {}
    ),
    current: c.classifications.reduce(
      (acc, c) => ({
        ...acc,
        [divIdToShort[c.division_id]]: Number(c.current_percent),
      }),
      {}
    ),
    reclassificationsByCurPercent: reclassificationsByCurPercent[memberNumber],
    reclassificationsByRecPercent: reclassificationsByRecPercent[memberNumber],
  };
};

export const getExtendedClassificationsInfo = lazy(() => {
  const result = [];

  const reclassificationsByCurPercent = getShooterToCurPercentClassifications();
  const reclassificationsByRecPercent = getShooterToRecPercentClassifications();

  processImport(
    "../../data/imported",
    /classification\.\d+\.json/,
    ({ value }) => {
      result.push(
        mapClassificationInfo(
          value,
          reclassificationsByCurPercent,
          reclassificationsByRecPercent
        )
      );
    }
  );
  return result;
});
