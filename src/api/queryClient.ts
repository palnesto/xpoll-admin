import { appToast } from "@/utils/toast";
import { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
import axios from "axios";
import { endpoints } from "./endpoints";

export const BASE_URL = import.meta.env.VITE_BACKEND_URL || "";

const apiInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ axios cancellation (AbortController / cancel token)
    const isCanceled =
      axios.isCancel(error) ||
      error?.code === "ERR_CANCELED" ||
      error?.name === "CanceledError" ||
      error?.message?.toLowerCase?.().includes("canceled") ||
      error?.cause?.name === "AbortError";

    if (isCanceled) {
      // Don't toast canceled requests; still reject so react-query can handle it as cancellation
      return Promise.reject(error);
    }

    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const message =
      error?.response?.data?.message || "An unexpected error occurred";

    // Don't toast for the normal auth probe 401
    if (!(status === 401 && url.includes(endpoints.profile.me))) {
      if (
        import.meta.env.VITE_MODE !== "production" &&
        import.meta.env.VITE_MODE !== "development"
      ) {
        appToast.error(message);
      }
    }

    return Promise.reject(error);
  },
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      queryFn: async ({ queryKey, signal }: QueryFunctionContext) => {
        const { data } = await apiInstance.get(String(queryKey[0]), { signal });
        return data;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default apiInstance;
