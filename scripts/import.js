import fs from "fs";
import { ZenRows } from "zenrows";
const client = new ZenRows(process.env.ZENROWS_API_KEY);
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

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const fetchFullNumberPageApi = async (
  memberNumberString,
  what = "classifiers",
  retryDelay = 1500
) => {
  try {
    const { data: fetched } = await client.get(
      `https://api.uspsa.org/api/app/${what}/${memberNumberString}`,
      { custom_headers: true },
      { headers: { "uspsa-api": process.env.USPSA_API_KEY } }
    );
    process.stdout.write(".");
    return fetched;
  } catch (err) {
    console.log("err: " + memberNumberString);
    console.log(err);
    exit(1);
    return null;
  }
};

const fetchAndSaveSlice = async (
  curSlice,
  what = "classifiers",
  sliceNumber = 0
) => {
  const curArray = [];
  for (let curNum of curSlice) {
    curArray.push(fetchFullNumberPageApi(curNum, what));
  }

  fs.writeFileSync(
    `./data/imported/${what}.${sliceNumber}.json`,
    JSON.stringify(await Promise.allSettled(curArray), null, 2)
  );
};

const fetchAll = async (what, numbers) => {
  const SLICE_SIZE = 256;
  const totalSlices = Math.ceil(numbers.length / SLICE_SIZE);
  console.log(
    `starting to fetch ${what} slices, total to fetch = ` + totalSlices
  );
  for (let i = 1; i <= totalSlices; ++i) {
    const curSlice = numbers.slice(SLICE_SIZE * (i - 1), SLICE_SIZE * i);
    await fetchAndSaveSlice(curSlice, what, i);
    console.log(`slice ${i} done`);
  }
};

const importEverything = async () => {
  console.log("fetching meta...");
  const response = await fetch(
    "https://uspsa.org/practiscore/practiscore_class_update.txt"
  );
  console.log("parsing...");
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
  console.log("division stats:");
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

  console.log("writing meta");
  fs.writeFileSync(
    "./data/meta/all.json",
    JSON.stringify(shooterObjects, null, 2)
  );
  const classifiedNumbers = shooterObjects
    .filter(hasAnyClassification)
    .map((s) => s.memberNumber);
  fs.writeFileSync(
    "./data/meta/classified.json",
    JSON.stringify(classifiedNumbers, null, 2)
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
  console.log("done");

  console.log("fetching all classifications");
  await fetchAll("classification", classifiedNumbers);
  console.log("done");

  console.log("fetching all classifier scores");
  await fetchAll("classifiers", classifiedNumbers);
  console.log("done");

  console.log("All Done!");
};

//fetchFullNumberPageApi("TY307");
importEverything();
