import { appToast } from "@/utils/toast";
import { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
import axios from "axios";
import { endpoints } from "./endpoints"; // ← add

export const BASE_URL = import.meta.env.VITE_BACKEND_URL || "";

const apiInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    console.log("error", error);
    const errorMessage =
      error?.response?.data?.message || "An unexpected error occurred";

    // Don't toast on the normal auth probe 401
    if (!(status === 401 && url.includes(endpoints.adminMe))) {
      appToast.error(errorMessage);
    }
    return Promise.reject(error);
  }
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // keep the default queryFn shape you’re already using
      queryFn: async ({ queryKey, signal }: QueryFunctionContext) => {
        const { data } = await apiInstance(String(queryKey[0]), { signal });
        return data;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default apiInstance;
