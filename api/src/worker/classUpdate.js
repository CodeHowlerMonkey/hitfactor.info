import { UTCDate } from "../../../shared/utils/date.js";

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

  Generated: "generated",
};

const isValidDate = jsDate => !Number.isNaN(jsDate.getTime());

export const fetchPSClassUpdateCSVTextFile = async () => {
  try {
    const response = await fetch(
      "https://uspsa.org/practiscore/practiscore_class_update.txt"
    );
    return response.text();
  } catch (err) {
    console.error("failed to fetch text lines");
    console.error(err);
  }

  return [];
};

export const practiscoreClassUpdateFromTextFile = async text => {
  const lines = text.split("\n");
  if (!lines.length) {
    return null;
  }

  // parse $INFO & generated date
  const infoLines = lines.filter(line => line.startsWith("$INFO"));
  const infoLinesObject = Object.fromEntries(
    infoLines.map(line => {
      const [infoLineKey, infoLineValue] = line.replace(/^\$INFO\s/, "").split(" ");
      return [fieldNameMap[infoLineKey] || infoLineKey, infoLineValue];
    })
  );
  const generated = UTCDate(infoLinesObject.generated);
  if (!isValidDate(generated)) {
    console.error(`invalid generated date: ${infoLinesObject.generated}`);
    return null;
  }

  // parse & return CSV with extra & transformed values
  const fieldsLine = lines.find(line => line.startsWith("$FIELDS"));
  if (!fieldsLine) {
    console.error("no $FIELDS detected");
    return null;
  }
  const fields = fieldsLine.split("$FIELDS ").filter(Boolean)[0].split(",");
  return lines
    .filter(curLine => !curLine.startsWith("$"))
    .map(curLine => {
      const curLineAsObject = Object.fromEntries(
        curLine.split(",").map((value, index) => [fieldNameMap[fields[index]], value])
      );

      const { memberId, expires } = curLineAsObject;
      const expiresDate = UTCDate(expires);
      const memberIdNumber = Number(memberId);

      return {
        ...infoLinesObject,
        ...curLineAsObject,
        memberId: Number.isNaN(memberIdNumber) ? memberId : memberIdNumber + 3,
        expires: isValidDate(expiresDate) ? expiresDate : null,
        generated,
      };
    });
};
