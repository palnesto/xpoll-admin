// src/components/modals/ad/ad-owner/delete.tsx
import { useCallback, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { CustomModal } from "@/components/modals/custom-modal";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { appToast } from "@/utils/toast";

type AdOwner = {
  _id: string;
  name: string;
  description?: string | null;
  internalAuthor?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  adOwnerId: string;
};

export default function ConfirmArchiveAdOwnerModal({
  isOpen,
  onClose,
  adOwnerId,
}: Props) {
  const getUrl = useMemo(() => {
    if (!adOwnerId) return "";
    return endpoints.entities.ad.adOwners.getById(
      { adOwnerId },
      { includeArchived: "true" },
    );
  }, [adOwnerId]);

  const {
    data: byIdData,
    isLoading: isLoadingById,
    isFetching: isFetchingById,
    error: byIdError,
    refetch,
  } = useApiQuery(getUrl, {
    key: ["ad-owner-by-id", adOwnerId, getUrl],
    enabled: !!adOwnerId && isOpen,
  } as any);

  // ensure we fetch fresh when opening
  useEffect(() => {
    if (!isOpen) return;
    try {
      (refetch as any)?.();
    } catch {}
  }, [isOpen, getUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const owner: AdOwner | null = (byIdData as any)?.data?.data ?? null;

  const isDetailsReady = !!owner?._id && !isLoadingById && !isFetchingById;
  const isAlreadyArchived = !!owner?.archivedAt;

  const { mutateAsync, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.ad.adOwners.delete(adOwnerId),
    method: "DELETE",
    onSuccess: () => {
      appToast.success("Ad owner archived");

      // ✅ invalidate view + listing
      const viewUrl = endpoints.entities.ad.adOwners.getById(
        { adOwnerId },
        { includeArchived: "true" },
      );

      queryClient.invalidateQueries({ queryKey: ["GET", viewUrl] });
      queryClient.invalidateQueries({ queryKey: [viewUrl] });

      queryClient.invalidateQueries({
        predicate: (q) => {
          const key0 = String(q.queryKey?.[0] ?? "");
          return (
            key0.includes(
              "/internal/advertisement/advertisement-owner/advanced-listing",
            ) || key0.includes("/internal/advertisement/advertisement-owner/")
          );
        },
      });

      onClose();
    },
    onError: (e: any) => {
      appToast.error(e?.message ?? "Failed to archive ad owner");
    },
  });

  const doArchive = useCallback(async () => {
    if (!adOwnerId) return;
    await mutateAsync(undefined as any);
  }, [adOwnerId, mutateAsync]);

  if (!isOpen) return null;

  const showLoading = !!adOwnerId && (isLoadingById || isFetchingById);

  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={isAlreadyArchived ? "Ad Owner Archived" : "Archive Ad Owner"}
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
            Failed to fetch owner details. Please close and try again.
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          {isAlreadyArchived
            ? "This ad owner is already archived."
            : "This action will archive the ad owner and remove it from active listings."}
        </p>

        {/* Details */}
        <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Name</div>
            <div className="text-sm font-medium">
              {isDetailsReady ? owner?.name || "—" : "Loading..."}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Description</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
              {isDetailsReady
                ? owner?.description?.trim()
                  ? owner.description
                  : "—"
                : "Loading..."}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Owner ID</div>
            <div className="font-mono text-xs break-all">{adOwnerId}</div>
          </div>
        </div>

        {/* Actions */}
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
                ? "Fetching owner details..."
                : isAlreadyArchived
                  ? "Already archived"
                  : "Archive this owner"
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
