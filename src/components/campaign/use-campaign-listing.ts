import { useEffect, useMemo, useState } from "react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { CampaignListItem, CampaignStatus } from "@/components/campaign/types";

export const PAGE_SIZE = 12;
 
export const SEARCH_DEBOUNCE_MS = 400;

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

 export type CampaignListingState = {
  page: number;
  setPage: (p: number) => void;
  externalAuthorId: string | null;
  setExternalAuthorId: (v: string | null) => void;
  externalAuthorLabel: string;
  setExternalAuthorLabel: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  status: CampaignStatus | "";
  setStatus: (v: CampaignStatus | "") => void;
  rewardAsset: string;
  setRewardAsset: (v: string) => void;
};
 
export type CampaignListingResult = {
  entries: CampaignListItem[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: unknown;
  refetch: () => void;
};
 
export function buildCampaignListingUrl(
  state: Pick<CampaignListingState, "page" | "externalAuthorId" | "status">,
  debouncedName: string,
  debouncedRewardAsset: string
): string {
  const usp = new URLSearchParams();
  usp.set("page", String(state.page));
  usp.set("pageSize", String(PAGE_SIZE));
  if (state.externalAuthorId) usp.set("externalAuthor", state.externalAuthorId);
  const nm = debouncedName.trim();
  if (nm) usp.set("name", nm);
  if (state.status) usp.set("status", state.status);
  const ra = debouncedRewardAsset.trim();
  if (ra) usp.set("rewardAssets", ra);
  const base = endpoints.entities.campaigns.advancedListing;
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}
 
function parseCampaignListingPayload(data: unknown): {
  entries: CampaignListItem[];
  total: number;
} {
  const payload = (data as any)?.data?.data ?? (data as any)?.data ?? {};
  const entries: CampaignListItem[] = Array.isArray(payload.entries)
    ? payload.entries
    : [];
  const total: number =
    typeof payload.total === "number" ? payload.total : entries.length ?? 0;
  return { entries, total };
}
 
export function useCampaignListing(
  state: CampaignListingState
): CampaignListingResult {
  const {
    page,
    externalAuthorId,
    name,
    status,
    rewardAsset,
  } = state;

  const debouncedName = useDebouncedValue(name, SEARCH_DEBOUNCE_MS);
  const debouncedRewardAsset = useDebouncedValue(
    rewardAsset,
    SEARCH_DEBOUNCE_MS
  );

  const urlWithQuery = useMemo(
    () =>
      buildCampaignListingUrl(
        { page, externalAuthorId, status },
        debouncedName,
        debouncedRewardAsset
      ),
    [page, externalAuthorId, debouncedName, status, debouncedRewardAsset]
  );

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    { key: ["campaigns-advanced", urlWithQuery] } as any
  );

  useEffect(() => {
    try {
      (refetch as () => void)?.();
    } catch {
      // ignore
    }
  }, [urlWithQuery]);  

  const { entries, total } = parseCampaignListingPayload(data);
  const totalPages = Math.max(1, Math.ceil((total || 1) / PAGE_SIZE));

  return {
    entries,
    total,
    totalPages,
    loading: isLoading || isFetching,
    error,
    refetch,
  };
}
