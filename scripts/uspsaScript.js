const USPSA_API_KEY = "INSERT_YOURS";

(function (console) {
  console.save = function (data, filename, contentType = "text/html") {
    if (!data) {
      console.error("Console.save: No data");
      return;
    }

    if (!filename) {
      console.error("Console.save: No filename");
    }

    if (typeof data === "object") {
      data = JSON.stringify(data, undefined, 4);
    }

    const blob = new Blob([data], { type: contentType });
    const e = document.createEvent("MouseEvents");
    const a = document.createElement("a");

    a.download = filename;
    a.href = window.URL.createObjectURL(blob);
    a.dataset.downloadurl = [contentType, a.download, a.href].join(":");
    e.initMouseEvent(
      "click",
      true,
      false,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null,
    );
    a.dispatchEvent(e);
  };
})(console);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// TODO: 'classification' instead of 'classifiers' for only current percentages
const fetchFullNumberPageApi = async (memberNumberString, what = "classifiers") => {
  const fetched = await fetch(
    `https://api.uspsa.org/api/app/${what}/${memberNumberString}`,
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "accept-encoding": "gzip, deflate, br",

        referrer: "http://localhost:8080",
        origin: "http://localhost:8080",
        host: "api.uspsa.org",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        "Uspsa-Api-Version": "1.1.3",
        "Uspsa-Api": USPSA_API_KEY,
      },
      referrer: "http://localhost:8080",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    },
  );

  // default cloudflare rate limit is bracketed in 5 minute blocks, so wait 5 mins if you encountered 429
  if (fetched.status === 429) {
    await delay(5 * 60 * 1000 + 3000);
  }

  // not found for json is just 404
  if (fetched.status !== 200) {
    return null;
  }

  return await fetched.json();
};

// TODO:
// try A, TY, FY (later L, B)
const fetchNumberPageApi = async memberNumber => {
  for (const prefix of ["A", "TY", "FY"]) {
    const curFullMemberNumber = prefix + memberNumber;

    console.log(`[api]trying ${curFullMemberNumber}`);
    const curAttempt = await fetchFullNumberPageApi(curFullMemberNumber);
    if (curAttempt) {
      console.log(`[api]found json for ${curFullMemberNumber}`);
      console.save(curAttempt, `${curFullMemberNumber}.json`, "text/json");
      break;
    }
  }
};

// Jan 23 2024, there are no member numbers higher than 158000
for (let i = 5000; i <= 158000; ++i) {
  const curNumber = 1 + i;
  await fetchNumberPageApi(curNumber);
}
