import fs from "fs";

import uniqBy from "lodash.uniqby";
import { request as undiciRequest } from "undici";

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
const hasCertainClassification = (shooterObj, div, letter) =>
  [letter].includes(shooterObj[div]);
const isDivShooter = div => shooterObj => hasClassification(shooterObj, div);
const hasAnyClassification = shooterObj =>
  allDivs.some(div => hasClassification(shooterObj, div));
const hasLetterClassification = letter => shooterObj =>
  allDivs.some(div => hasCertainClassification(shooterObj, div, letter));
const hasGMClassification = hasLetterClassification("GM");

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const quickRandomDelay = () => {
  const ms = Math.ceil(32 + 40 * Math.random());
  return delay(ms);
};

const retryDelay = retry => {
  const quickRandom = Math.ceil(32 + 40 * Math.random());
  return delay(retry * 125 + quickRandom);
};

const USPSA_DIRECT = true;
const USPSA_IP = process.env.USPSA_IP;
const USPSA_HOST = "api.uspsa.org";
const USPSA_BASE = USPSA_DIRECT ? USPSA_IP : USPSA_HOST;

const _fetch = async url => {
  const headers = {
    accept: "application/json",
    "uspsa-api": process.env.USPSA_API_KEY,
    "Uspsa-Api-Version": "1.1.3",
    "Uspsa-Debug": "FALSE",
  };

  if (url.includes(USPSA_IP)) {
    const apiRequest = await undiciRequest(url, {
      headers: { ...headers, host: USPSA_HOST },
    });
    return await apiRequest.body.json();
  }

  const response = await fetch(url, { headers });
  const data = await response.json();

  return data;
};

let successfulRequests = 0;
const errors = [];
const fetchApiEndpoint = async (endpoint, tryNumber = 1, maxTries = 7) => {
  try {
    const fetched = await _fetch(`https://${USPSA_BASE}/api/app/${endpoint}`, tryNumber);
    process.stdout.write(".");
    successfulRequests++;
    return fetched;
  } catch (err) {
    if (tryNumber <= maxTries) {
      process.stdout.write("o");
      if (!USPSA_DIRECT) {
        await retryDelay(tryNumber);
      }
      return await fetchApiEndpoint(endpoint, tryNumber + 1, maxTries);
    }

    console.log(`successfulRequests: ${successfulRequests}`);
    process.stdout.write("X");
    errors.push(endpoint);
    return null;
  }
};

const fetchFullNumberPageApi = async (memberNumberString, what = "classifiers") => {
  const result = await fetchApiEndpoint(`${what}/${memberNumberString}`);
  if (result?.member_data) {
    const resultMemberNumber = result?.member_data?.member_number;
    if (!resultMemberNumber || resultMemberNumber === "Private") {
      result.member_data.member_number = memberNumberString;
    }
  }
  return result;
};

const fetchAndSaveSlice = async (
  curSlice,
  what = "classifiers",
  sliceNumber = 0,
  suffix = "",
) => {
  const curArray = [];
  for (const curNum of curSlice) {
    curArray.push(fetchFullNumberPageApi(curNum, what));
    //curArray.push(await fetchFullNumberPageApi(curNum, what));
  }

  fs.writeFileSync(
    `./data/imported/${[what, suffix, sliceNumber].filter(Boolean).join(".")}.json`,
    JSON.stringify(await Promise.allSettled(curArray), null, 2),
    //JSON.stringify(curArray, null, 2)
  );
};

const fetchAll = async (what, numbers, suffix) => {
  const SLICE_SIZE = 256;
  const totalSlices = Math.ceil(numbers.length / SLICE_SIZE);
  console.log(`starting to fetch ${what} slices, total to fetch = ${totalSlices}`);
  for (let i = 1; i <= totalSlices; ++i) {
    const curSlice = numbers.slice(SLICE_SIZE * (i - 1), SLICE_SIZE * i);
    await fetchAndSaveSlice(curSlice, what, i, suffix);
    console.log(`slice ${i} done`);
  }
};

const importEverything = async () => {
  console.log("fetching official hq hhfs & classifiers");
  const officialHHF = await fetchApiEndpoint("hhf/10");
  const classifiers = await fetchApiEndpoint("classifier");
  fs.writeFileSync("./data/hhf.json", JSON.stringify(officialHHF, null, 4));
  fs.writeFileSync(
    "./data/classifiers/classifiers.json",
    JSON.stringify(classifiers, null, 4),
  );
  console.log("done");

  console.log("fetching meta...");
  const response = await fetch(
    "https://uspsa.org/practiscore/practiscore_class_update.txt",
  );
  console.log("parsing...");
  const text = await response.text();
  const lines = text.split("\n");
  const fieldsLine = lines.find(line => line.startsWith("$FIELDS"));
  const fields = fieldsLine.split("$FIELDS ").filter(Boolean)[0].split(",");
  const shooterLines = lines.filter(line => !line.startsWith("$"));

  // prepare member numbers to import + show stats
  const lastImportTime = new Date("2024-03-31");
  const unfilteredShooterObjects = shooterLines.map(line =>
    Object.fromEntries(
      line.split(",").map((value, index) => [fieldNameMap[fields[index]], value]),
    ),
  );
  const shooterObjects = unfilteredShooterObjects.filter(s => {
    return true;
    const expiration = new Date(s.expires);
    if (expiration.getTime() === NaN) {
      return true; // badly formed expiration date for life membership
    }
    return expiration > lastImportTime;
  });

  const memberIdToNumber = unfilteredShooterObjects.reduce((acc, cur) => {
    acc[cur.memberId] = cur.memberNumber;
    return acc;
  }, {});
  const memberNumberToId = Object.fromEntries(
    Object.entries(memberIdToNumber).map(([k, v]) => [v, k]),
  );
  const usedMemberNumbers = uniqBy(
    Object.values(memberIdToNumber)
      .map(memberNumber => memberNumber.replace(/[a-zA-Z]/g, ""))
      .filter(Boolean),
    c => c,
  );
  const usedMemberNumbersMap = usedMemberNumbers.reduce((acc, cur) => {
    acc[cur] = true;
    return acc;
  }, {});
  console.log(Object.keys(usedMemberNumbersMap)[150999]);
  const lastUsedNumber = Number(usedMemberNumbers[usedMemberNumbers.length - 1]);
  console.log(lastUsedNumber);
  const monkeyNumbers = [];
  for (let i = 11111; i <= lastUsedNumber; ++i) {
    if (!usedMemberNumbersMap[i]) {
      monkeyNumbers.push(i);
    }
  }
  fs.writeFileSync(
    "./data/meta/monkeyNumbers.json",
    JSON.stringify(monkeyNumbers, null, 2),
  );
  const classifiedNumbers = unfilteredShooterObjects
    .filter(hasAnyClassification)
    .map(s => s.memberNumber);
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
  const classifiedGMNumbers = shooterObjects
    .filter(hasGMClassification)
    .map(s => s.memberNumber);
  const classifiedMNumbers = shooterObjects
    .filter(hasLetterClassification("M"))
    .map(s => s.memberNumber)
    .filter(s => !classifiedGMNumbers.includes(s));
  const classifiedANumbers = shooterObjects
    .filter(hasLetterClassification("A"))
    .map(s => s.memberNumber)
    .filter(s => ![...classifiedGMNumbers, ...classifiedMNumbers].includes(s));
  const classifiedBNumbers = shooterObjects
    .filter(hasLetterClassification("B"))
    .map(s => s.memberNumber)
    .filter(
      s =>
        ![...classifiedGMNumbers, ...classifiedMNumbers, ...classifiedANumbers].includes(
          s,
        ),
    );
  const classifiedCNumbers = shooterObjects
    .filter(hasLetterClassification("C"))
    .map(s => s.memberNumber)
    .filter(
      s =>
        ![
          ...classifiedGMNumbers,
          ...classifiedMNumbers,
          ...classifiedANumbers,
          ...classifiedBNumbers,
        ].includes(s),
    );
  const classifiedDNumbers = shooterObjects
    .filter(hasLetterClassification("D"))
    .map(s => s.memberNumber)
    .filter(
      s =>
        ![
          ...classifiedGMNumbers,
          ...classifiedMNumbers,
          ...classifiedANumbers,
          ...classifiedBNumbers,
          ...classifiedCNumbers,
        ].includes(s),
    );
  console.log({ total: shooterObjects.length });
  console.log({
    G: classifiedGMNumbers.length,
    M: classifiedMNumbers.length,
    A: classifiedANumbers.length,
    B: classifiedBNumbers.length,
    C: classifiedCNumbers.length,
    D: classifiedDNumbers.length,
  });

  console.log("writing meta");
  fs.writeFileSync(
    "./data/meta/all.json",
    JSON.stringify(unfilteredShooterObjects, null, 2),
  );
  fs.writeFileSync(
    "./data/meta/classified.json",
    JSON.stringify(classifiedNumbers, null, 2),
  );
  fs.writeFileSync(
    "./data/meta/memberIdToNumber.json",
    JSON.stringify(memberIdToNumber, null, 2),
  );
  fs.writeFileSync(
    "./data/meta/memberNumberToId.json",
    JSON.stringify(memberNumberToId, null, 2),
  );

  allDivs.forEach(div => {
    fs.writeFileSync(
      `./data/meta/classified.${div}.json`,
      JSON.stringify(
        shooterObjects.filter(isDivShooter(div)).map(s => s.memberNumber),
        null,
        2,
      ),
    );
  });
  fs.writeFileSync(
    "./data/meta/classified.gm.json",
    JSON.stringify(classifiedGMNumbers, null, 2),
  );
  fs.writeFileSync(
    "./data/meta/classified.m.json",
    JSON.stringify(classifiedMNumbers, null, 2),
  );
  fs.writeFileSync(
    "./data/meta/classified.a.json",
    JSON.stringify(classifiedANumbers, null, 2),
  );
  fs.writeFileSync(
    "./data/meta/classified.b.json",
    JSON.stringify(classifiedBNumbers, null, 2),
  );
  fs.writeFileSync(
    "./data/meta/classified.c.json",
    JSON.stringify(classifiedCNumbers, null, 2),
  );
  fs.writeFileSync(
    "./data/meta/classified.d.json",
    JSON.stringify(classifiedDNumbers, null, 2),
  );

  console.log("fetching all current GMs classifiers and classifications ");
  await Promise.all([
    fetchAll("classifiers", classifiedGMNumbers, "gm"),
    fetchAll("classification", classifiedGMNumbers, "gm"),
  ]);
  console.log("done");

  console.log("fetching all current Ms classifiers and classifications ");
  await Promise.all([
    fetchAll("classifiers", classifiedMNumbers, "m"),
    fetchAll("classification", classifiedMNumbers, "m"),
  ]);
  console.log("done");

  console.log("fetching all current As classifiers and classifications ");
  await Promise.all([
    fetchAll("classifiers", classifiedANumbers, "a"),
    fetchAll("classification", classifiedANumbers, "a"),
  ]);
  console.log("done");

  console.log("fetching all current Bs classifiers and classifications ");
  await Promise.all([
    fetchAll("classifiers", classifiedBNumbers, "b"),
    fetchAll("classification", classifiedBNumbers, "b"),
  ]);
  console.log("done");

  console.log("fetching all current Cs classifiers and classifications ");
  await Promise.all([
    fetchAll("classifiers", classifiedCNumbers, "c"),
    fetchAll("classification", classifiedCNumbers, "c"),
  ]);
  console.log("done");

  console.log("fetching all current Ds classifiers and classifications ");
  await Promise.all([
    fetchAll("classifiers", classifiedDNumbers, "d"),
    fetchAll("classification", classifiedDNumbers, "d"),
  ]);
  console.log("done");

  console.log("All Done!");

  console.log("Error URLS:");
  console.log(JSON.stringify(errors, null, 2));
};

importEverything();
