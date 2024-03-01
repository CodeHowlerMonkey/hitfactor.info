import fs from "fs";
const fieldNameMap = {
  USPSA: "memberNumber",
  PersonNumber: "memberId",
  Expires: "expires",
  CARRYOPTICS: "co",
  LIMITED10: "l10",
  LIMITEDOPTICS: "lo",
  LIMITED: "ltd",
  OPEN: "opn",
  PCC: "pcc",
  PRODUCTION: "prod",
  REVOLVER: "rev",
  SINGLESTACK: "ss",
};

const allDivs = ["opn", "ltd", "l10", "prod", "ss", "rev", "co", "lo", "pcc"];
const validClassifications = ["GM", "M", "A", "B", "C", "D"];
const hasClassification = (shooterObj, div) =>
  validClassifications.includes(shooterObj[div]);
const isDivShooter = (div) => (shooterObj) =>
  hasClassification(shooterObj, div);
const hasAnyClassification = (shooterObj) =>
  allDivs.some((div) => hasClassification(shooterObj, div));

const getMeta = async () => {
  const response = await fetch(
    "https://uspsa.org/practiscore/practiscore_class_update.txt"
  );
  const text = await response.text();
  const lines = text.split("\n");
  const fieldsLine = lines.find((line) => line.startsWith("$FIELDS"));
  const fields = fieldsLine.split("$FIELDS ").filter(Boolean)[0].split(",");
  const shooterLines = lines.filter((line) => !line.startsWith("$"));
  const shooterObjects = shooterLines.map((line) =>
    Object.fromEntries(
      line
        .split(",")
        .map((value, index) => [fieldNameMap[fields[index]], value])
    )
  );
  console.log(shooterLines.length);
  console.log(fieldsLine);
  console.log(shooterObjects.length);
  console.log(shooterObjects[24845]);
  console.log(shooterObjects.filter(hasAnyClassification).length);
  console.log({
    opn: shooterObjects.filter(isDivShooter("opn")).length,
    ltd: shooterObjects.filter(isDivShooter("ltd")).length,
    l10: shooterObjects.filter(isDivShooter("l10")).length,
    prod: shooterObjects.filter(isDivShooter("prod")).length,
    rev: shooterObjects.filter(isDivShooter("rev")).length,
    ss: shooterObjects.filter(isDivShooter("ss")).length,
    co: shooterObjects.filter(isDivShooter("co")).length,
    lo: shooterObjects.filter(isDivShooter("lo")).length,
    pcc: shooterObjects.filter(isDivShooter("pcc")).length,
  });
  console.log("MEMORY IN MB: ");
  console.log(process.memoryUsage().rss / 1024 / 1024);

  fs.writeFileSync(
    "./data/meta/all.json",
    JSON.stringify(shooterObjects, null, 2)
  );
  fs.writeFileSync(
    "./data/meta/classified.json",
    JSON.stringify(shooterObjects.filter(hasAnyClassification), null, 2)
  );
  fs.writeFileSync(
    "./data/meta/memberIdToNumber.json",
    JSON.stringify(
      shooterObjects.reduce((acc, cur) => {
        acc[cur.memberId] = cur.memberNumber;
        return acc;
      }, {}),
      null,
      2
    )
  );
  allDivs.forEach((div) => {
    fs.writeFileSync(
      "./data/meta/classified." + div + ".json",
      JSON.stringify(
        shooterObjects.filter(isDivShooter(div)).map((s) => s.memberNumber),
        null,
        2
      )
    );
  });
};

getMeta();
