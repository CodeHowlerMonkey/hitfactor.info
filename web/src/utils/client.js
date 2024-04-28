import { useEffect, useState } from "react";

const API_URL = "/api"; // react build served through node

/* Mom, can we have tanstack query at home? */
export const useApi = (endpoint, eraseDataBetweenLoads = true) => {
  const [json, setJson] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (eraseDataBetweenLoads) {
      setJson(null);
    }
    if (endpoint && !endpoint.includes("undefined")) {
      setLoading(true);
      window
        .fetch(API_URL + endpoint)
        .then((r) => {
          setLoading(false);
          return r.json();
        })
        .then((j) => setJson(j));
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
