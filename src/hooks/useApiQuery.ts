import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import apiInstance, { BASE_URL } from "../api/queryClient";
import { trimUrl } from "@/utils/formatter";

export const useApiQuery = (
  route: string,
  options?: UseQueryOptions<any, any>
) => {
  console.log("registering query", trimUrl(route));
  return useQuery({
    queryKey: [trimUrl(route)],
    queryFn: async () => {
      const response = await apiInstance.get(`${BASE_URL}${route}`);
      return response;
    },
    ...options,
  });
};
