import { useEffect, useMemo } from "react";
import { useApiQuery } from "./useApiQuery";
import { endpoints } from "@/api/endpoints";
import { useAdminAuthStore } from "@/stores/useAdminAuth";
import { useApiMutation } from "./useApiMutation";
import { queryClient } from "@/api/queryClient";

export function useAdminAuth() {
  const { user, setUser } = useAdminAuthStore();

  // Keep using the existing hook; we won't change its behavior.
  const {
    data, // AxiosResponse | undefined
    isLoading, // fetch in-flight
    isError, // e.g., 401 / network
    isSuccess, // successfully fetched
    refetch,
  } = useApiQuery(endpoints.adminMe, {
    retry: false,
    refetchInterval: 1000 * 60, // ← keep if you want periodic recheck
  });

  // Your ApiResponse shape was ApiResponse<{...user...}>
  const serverUser = data?.data?.data ?? null;

  useEffect(() => {
    if (serverUser) setUser(serverUser);
  }, [serverUser, setUser]);

  // We only make an auth decision once the probe settled
  const hasAuthVerdict = useMemo(
    () => !isLoading && (isSuccess || isError),
    [isLoading, isSuccess, isError]
  );

  // Prefer freshly-fetched user; fall back to store (e.g., right after login)
  const authenticated = useMemo(
    () => Boolean(serverUser || user),
    [serverUser, user]
  );

  const { mutateAsync: logout } = useApiMutation<void, void>({
    route: endpoints.adminLogout,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoints.adminMe] });
      setUser(null);
      window.location.href = "/login"; // ← match your actual login route
    },
  });

  return {
    user: serverUser ?? user,
    authenticated,
    hasAuthVerdict,
    isLoading,
    isError,
    isSuccess,
    refetch,
    logout,
  };
}
