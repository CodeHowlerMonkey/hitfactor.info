import { useEffect, useState } from "react";
import useAsyncEffect from "./useAsyncEffect";

const API_URL = "/api"; // react build served through node

/* Mom, can we have tanstack query? No we have tanstack query at home */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fetchJSON = async (endpoint, attempt = 1, maxAttempts = 3) => {
  try {
    const response = await window.fetch(API_URL + endpoint);
    const json = await response.json();
    if (json) {
      return json;
    }
  } catch (e) {
    if (attempt > maxAttempts) {
      throw e;
    }
  }

  if (attempt <= maxAttempts) {
    await delay(300 * attempt);
    return await fetchJSON(endpoint, attempt + 1, maxAttempts);
  }

  return null;
};

export const useApi = (endpoint, eraseDataBetweenLoads = true) => {
  const [json, setJson] = useState(null);
  const [loading, setLoading] = useState(false);
  useAsyncEffect(async () => {
    if (eraseDataBetweenLoads) {
      setJson(null);
    }
    if (endpoint && !endpoint.includes("undefined")) {
      setLoading(true);
      const json = await fetchJSON(endpoint);
      setJson(json);
      setLoading(false);
    }
  }, [endpoint]);

  return { json, loading };
};

export const postApi = async (endpoint, body) => {
  try {
    const response = await window.fetch(API_URL + endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
      },
    });
    return await response.json();
  } catch (e) {
    console.error(e);
    throw e;
  }

  return null;
};

export const getApi = async (endpoint) => {
  try {
    const response = await window.fetch(API_URL + endpoint);
    return await response.json();
  } catch (e) {
    console.error(e);
    throw e;
  }

  return null;
};
