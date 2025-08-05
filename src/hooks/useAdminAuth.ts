// src/hooks/useAdminAuth.ts
import { useEffect } from "react";
import { useApiQuery } from "./useApiQuery";
import { endpoints } from "@/api/endpoints";
import { useAdminAuthStore } from "@/stores/useAdminAuth";
import { useApiMutation } from "./useApiMutation";
import { queryClient } from "@/api/queryClient";

export function useAdminAuth() {
  const { user, setUser } = useAdminAuthStore();

  // 1️⃣ Load “me”
  const { data, isLoading, isError, refetch } = useApiQuery(endpoints.adminMe, {
    refetchInterval: 1000 * 60, // 1 minute
  });

  useEffect(() => {
    if (!data) return;
    setUser(data?.data?.data);
  }, [data, setUser]);

  // 2️⃣ Logout
  const { mutateAsync: logout } = useApiMutation<void, void>({
    route: endpoints.adminLogout,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries(endpoints.adminMe);
      setUser(null);
      window.location.href = "/admin/login";
    },
  });

  return { user, isLoading, isError, refetch, logout };
}
