import { appToast } from "@/utils/toast";
import { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
import axios from "axios";

export const BASE_URL = import.meta.env.VITE_BACKEND_URL! || "";

const apiInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Add an interceptor for error handling
apiInstance.interceptors.response.use(
  (response) => response, // Pass through successful responses
  (error) => {
    // Extract message from error
    const errorMessage =
      error.response?.data?.message || "An unexpected error occurred";
    appToast.error(errorMessage); // Show the error toast
    return Promise.reject(error); // Pass the error to the caller
  }
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // refetchOnWindowFocus: false,
      retry: false,
      queryFn: async ({ queryKey, signal }: QueryFunctionContext) => {
        const { data } = await apiInstance(`${queryKey[0]}`, { signal });
        return data;
      },
    },
  },
});

export default apiInstance;
