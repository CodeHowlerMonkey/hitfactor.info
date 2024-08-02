import { API_URL } from "../query/useApiQuery.ts";

export { useApiQuery as useApi } from "../query/useApiQuery.ts";
export { keepPreviousData } from "../query/useApiQuery.ts";

// TODO: refactor to use RQ mutations and move to web/src/query/
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
};

// TODO: use useApiQuery instead
export const getApi = async (endpoint) => {
  try {
    const response = await window.fetch(API_URL + endpoint);
    return await response.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
};
