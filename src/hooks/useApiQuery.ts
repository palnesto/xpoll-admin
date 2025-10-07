import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import apiInstance, { BASE_URL } from "../api/queryClient";
// import { trimUrl } from "@/utils/formatter"; // not needed for the key

export const useApiQuery = (
  route: string,
  options?: UseQueryOptions<any, any>
) => {
  // Keep this if you want, but include the querystring in the log:
  console.log("registering query", route);

  return useQuery({
    // 👇 include full route (WITH ?page=…&pageSize=…) so key changes when page changes
    queryKey: ["GET", route],
    queryFn: async () => {
      const response = await apiInstance.get(`${BASE_URL}${route}`);
      return response;
    },
    // if you usually want this behavior, set defaults here;
    // caller can still override via options.
    keepPreviousData: true,
    staleTime: 0,
    refetchOnWindowFocus: false,
    ...options,
  });
};
