import { useEffect, useState } from "react";

const API_URL = "/api"; // react build served through node

/* Mom, can we have tanstack query at home? */
export const useApi = (endpoint) => {
  const [json, setJson] = useState(null);
  useEffect(() => {
    setJson(null);
    if (endpoint && !endpoint.includes("undefined")) {
      window
        .fetch(API_URL + endpoint)
        .then((r) => r.json())
        .then((j) => setJson(j));
    }
  }, [endpoint]);
  return json;
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
