import { useCallback, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

import { queryClient } from "@/api/queryClient";
import { CustomModal } from "@/components/modals/custom-modal";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { appToast } from "@/utils/toast";

type Ad = {
  _id: string;
  title: string;
  description?: string | null;
  archivedAt?: string | null;
  status?: "draft" | "scheduled" | "live" | "ended";
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  adId: string;
};

export default function ConfirmArchiveAdModal({
  isOpen,
  onClose,
  adId,
}: Props) {
  const getUrl = useMemo(() => {
    if (!adId) return "";
    return `/internal/advertisement/ad/${adId}?includeArchived=true`;
  }, [adId]);

  const {
    data: byIdData,
    isLoading: isLoadingById,
    isFetching: isFetchingById,
    error: byIdError,
    refetch,
  } = useApiQuery(getUrl, {
    key: ["ad-by-id", adId, getUrl],
    enabled: !!adId && isOpen,
  } as any);

  useEffect(() => {
    if (!isOpen) return;
    try {
      (refetch as any)?.();
    } catch {}
  }, [isOpen, getUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const ad: Ad | null = (byIdData as any)?.data?.data ?? null;

  const isDetailsReady = !!ad?._id && !isLoadingById && !isFetchingById;
  const isAlreadyArchived = !!ad?.archivedAt;

  const { mutateAsync, isPending } = useApiMutation<any, any>({
    route: `/internal/advertisement/ad/${adId}`,
    method: "DELETE",
    onSuccess: () => {
      appToast.success("Ad archived");

      // invalidate listing + view
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k0 = String(q.queryKey?.[0] ?? "");
          return (
            k0.includes("/internal/advertisement/ad/advanced-listing") ||
            k0.includes("/internal/advertisement/ad/")
          );
        },
      });

      onClose();
    },
    onError: (e: any) => {
      appToast.error(e?.message ?? "Failed to archive ad");
    },
  });

  const doArchive = useCallback(async () => {
    if (!adId) return;
    await mutateAsync(undefined as any);
  }, [adId, mutateAsync]);

  if (!isOpen) return null;

  const showLoading = !!adId && (isLoadingById || isFetchingById);

  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={isAlreadyArchived ? "Ad Archived" : "Archive Ad"}
      footer={<></>}
      onSubmit={() => {}}
      needX
      isSubmitting={isPending}
      isLoading={showLoading}
      loader={<div className="animate-pulse">Loading...</div>}
    >
      <div className="space-y-4">
        {byIdError ? (
          <p className="text-sm text-red-500">
            Failed to fetch ad details. Please close and try again.
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          {isAlreadyArchived
            ? "This ad is already archived."
            : "This action will archive the ad and remove it from active listings."}
        </p>

        <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Title</div>
            <div className="text-sm font-medium">
              {isDetailsReady ? ad?.title || "—" : "Loading..."}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Description</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
              {isDetailsReady
                ? ad?.description?.trim()
                  ? ad.description
                  : "—"
                : "Loading..."}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Ad ID</div>
            <div className="font-mono text-xs break-all">{adId}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Close
          </Button>

          <Button
            variant="destructive"
            onClick={doArchive}
            disabled={!isDetailsReady || isPending || isAlreadyArchived}
            title={
              !isDetailsReady
                ? "Fetching ad details..."
                : isAlreadyArchived
                  ? "Already archived"
                  : "Archive this ad"
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Archive
          </Button>
        </div>
      </div>
    </CustomModal>
  );
}
