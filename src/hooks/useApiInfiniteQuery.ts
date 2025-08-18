// src/hooks/useApiInfiniteQuery.ts
import {
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import apiInstance from "@/api/queryClient";

// Standard shape for paginated responses
export type ApiInfiniteData<T> = {
  entries: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export function useApiInfiniteQuery<
  T,
  E = unknown,
  F extends Record<string, unknown> = Record<string, unknown>
>(
  route: string,
  filters?: F,
  pageSize = 50,
  options?: Omit<
    UseInfiniteQueryOptions<
      ApiInfiniteData<T>,
      E,
      ApiInfiniteData<T>, // <-- result must match returned value
      ApiInfiniteData<T>, // <-- result per page
      [string, F?] // queryKey type
    >,
    "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam"
  >
) {
  return useInfiniteQuery({
    queryKey: [route, filters] as const,
    queryFn: async ({ pageParam = 1, signal }) => {
      const params = { page: pageParam, pageSize, ...(filters ?? {}) };
      const res = await apiInstance.get<{ data: ApiInfiniteData<T> }>(route, {
        params,
        signal,
      });
      return res.data.data;
    },
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    initialPageParam: 1,
    ...options,
  });
}
