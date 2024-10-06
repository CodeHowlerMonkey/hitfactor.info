import FormData from "form-data";
import { ZenRows } from "zenrows";

import { saveActiveMembersFromPSClassUpdate } from "../../../../db/activeMembers";
import { Scores, scoresFromClassifierFile } from "../../../../db/scores";
import { shooterObjectsFromClassificationFile, Shooter } from "../../../../db/shooters";
import {
  fetchPSClassUpdateCSVTextFile,
  practiscoreClassUpdateFromTextFile,
} from "../../../../worker/classUpdate";
import { metaLoop, classifiersAndShootersFromScores } from "../../../../worker/uploads";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const retryDelay = retry => {
  const quickRandom = Math.ceil(32 + 40 * Math.random());
  return delay(retry * 312 + quickRandom);
};

const fetchUSPSAEndpoint = async (sessionKey, endpoint, tryNumber = 1, maxTries = 3) => {
  try {
    const client = new ZenRows(process.env.ZENROWS_API_KEY);
    // const response = await fetch(
    const { data } = await client.get(
      `https://api.uspsa.org/api/app/${endpoint}`,
      { custom_headers: true },
      {
        headers: {
          accept: "application/json",
          "uspsa-api": sessionKey,
          "Uspsa-Api-Version": "1.1.3",
          "Uspsa-Debug": "FALSE",
          "user-agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
          Accept: "application/json",
        },
      },
    );
    return data;
    // return await response.json();
  } catch (err) {
    if (tryNumber <= maxTries) {
      await retryDelay(tryNumber);
      return fetchUSPSAEndpoint(sessionKey, endpoint, tryNumber + 1, maxTries);
    }

    return null;
  }
};

const loginToUSPSA = async (username, password) => {
  try {
    const client = new ZenRows(process.env.ZENROWS_API_KEY);
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    //const response = await fetch("https://api.uspsa.org/api/app/login", {
    const { data } = await client.post(
      "https://api.uspsa.org/api/app/login",
      { custom_headers: true },
      {
        headers: {
          "uspsa-api-version": "1.1.3",
          "uspsa-debug": "FALSE",
          "user-agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
          ...formData.getHeaders(),
        },
        data: formData,
      },
    );
    //return await response.json();
    return data;
  } catch (err) {
    console.error("loginToUSPSA error");
    console.error(err);
  }
  return null;
};

const uspsaUploadRoutes = async (fastify, opts) => {
  fastify.post("/activeMembers", async (req, res) => {
    return { error: "disabled" };
    const text = await fetchPSClassUpdateCSVTextFile();
    if (!text) {
      return { error: "no text" };
    }
    const update = practiscoreClassUpdateFromTextFile(text);
    if (!update) {
      console.log(text);
      return { error: "failed to parse", text };
    }

    const result = await saveActiveMembersFromPSClassUpdate(update);
    return { result };
  });

  fastify.post("/", async (req, res) => {
    return {
      error:
        "USPSA Imports Are Disabled\n\n" +
        "Think they shouldn't be?\n" +
        "Email USPSA and request that they work with Howler Monkeys " +
        "to fix the Classification System:\n" +
        "it@uspsa.org, data@uspsa.org, board@uspsa.org",
    };
    const { memberNumber, password } = req.body;

    const loginResult = await loginToUSPSA(memberNumber, password);
    if (!loginResult) {
      return {
        error: "Can't login to USPSA",
      };
    }
    if (!loginResult?.success) {
      return {
        error: loginResult?.message || loginResult,
      };
    }

    const { session_key, member_number } = loginResult?.member_data || {};
    if (!session_key || !member_number) {
      return { error: "Unexpected Login Response" };
    }
    const [uspsaClassifiers, uspsaClassification] = await Promise.all([
      fetchUSPSAEndpoint(session_key, `classifiers/${member_number}`),
      fetchUSPSAEndpoint(session_key, `classification/${member_number}`),
    ]);
    if (!uspsaClassifiers && !uspsaClassification) {
      return { error: "Can't fetch data from USPSA" };
    }

    try {
      const scores = scoresFromClassifierFile({ value: uspsaClassifiers });
      await Scores.bulkWrite(
        scores.map(s => ({
          updateOne: {
            filter: {
              memberNumberDivision: s.memberNumberDivision,
              classifierDivision: s.classifierDivision,
              hf: s.hf,
              sd: s.sd,
              // some PS matches don't have club set, but all USPSA uploads do,
              // so to prevent dupes, don't filter by club on score upsert
              // clubid: s.clubid,
            },
            update: { $set: s },
            upsert: true,
          },
        })),
      );
      const shooterObjs = await shooterObjectsFromClassificationFile(uspsaClassification);
      await Shooter.bulkWrite(
        shooterObjs
          .filter(s => !!s.memberNumber)
          .map(s => ({
            updateOne: {
              filter: {
                memberNumber: s.memberNumber,
                division: s.division,
              },
              update: { $set: s },
              upsert: true,
            },
          })),
      );

      const { classifiers, shooters } = classifiersAndShootersFromScores(scores);
      setImmediate(async () => {
        await metaLoop();
      });

      return {
        result: {
          classifiers,
          shooters,
        },
      };
    } catch (e) {
      console.error(e);
      return { error: "Can't parse USPSA data" };
    }
  });
};

export default uspsaUploadRoutes;
