import { useQuery, UseQueryOptions } from "@tanstack/react-query";

export { keepPreviousData } from "@tanstack/react-query";

export const API_URL = "/api"; // react build served through node

export const queryKeyForPathAndQueryString = (pathAndQueryString: string): string[] => {
  try {
    const url = new URL(`https://0:0/${pathAndQueryString}`);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const searchParamPairs = [...url.searchParams]
      .filter(([, v]) => !!v)
      .map(([key, value]) => `${key}=${value}`);
    return ([] as string[]).concat(pathSegments, searchParamPairs);
  } catch (e) {
    console.error(e);
    return ["__INVALID_ENDPOINT_QUERY_KEY"];
  }
};

export const useApiQuery = (endpoint: string, options: UseQueryOptions) => {
  const url = API_URL + endpoint;

  const { data, isPending, isFetching } = useQuery({
    ...options,
    queryKey: queryKeyForPathAndQueryString(url),
    queryFn: async () => {
      const response = await window.fetch(url);
      if (!response.ok) {
        throw new Error("bad response");
      }
      return response.json();
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 10_000),
    refetchOnWindowFocus: false,
  });

  return { json: data, loading: isPending, isFetching };
};

export default useApiQuery;
