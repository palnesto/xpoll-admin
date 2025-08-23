// utils/queryInvalidate.ts
import { queryClient } from "@/api/queryClient";

export const invalidateByPrefix = (prefix: string) =>
  queryClient.invalidateQueries({
    predicate: (q) =>
      typeof q.queryKey?.[0] === "string" &&
      (q.queryKey[0] as string).startsWith(prefix),
  });
