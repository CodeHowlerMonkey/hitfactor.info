import { useEffect, useState } from "react";

const API_URL = "/api"; // react build served through node

/* Mom, can we have tanstack query at home? */
export const useApi = (endpoint) => {
  const [json, setJson] = useState(null);
  useEffect(() => {
    setJson(null);
    if (endpoint) {
      window
        .fetch(API_URL + endpoint)
        .then((r) => r.json())
        .then((j) => setJson(j));
    }
  }, [endpoint]);
  return json;
};
