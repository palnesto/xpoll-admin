// src/components/modals/ad/ad-owner/delete.tsx

import { useEffect, useMemo } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type AdOwner = {
  _id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
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

  useEffect(() => {
    if (!isOpen) return;
    try {
      (refetch as any)?.();
    } catch {}
  }, [isOpen, getUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const owner: AdOwner | null = (byIdData as any)?.data?.data ?? null;
  const isAlreadyArchived = !!owner?.archivedAt;
  const showLoading = !!adOwnerId && (isLoadingById || isFetchingById);

  const { mutateAsync, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.ad.adOwners.delete(adOwnerId),
    method: "DELETE",
    onSuccess: () => {
      appToast.success("Ad owner archived");

      // invalidate view + listings
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

  const onConfirm = async () => {
    if (!adOwnerId) return;
    return mutateAsync(undefined as any).catch(() => undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/25">
              <AlertTriangle className="h-4 w-4 text-red-300" />
            </span>
            {isAlreadyArchived ? "Ad Owner Archived" : "Archive Ad Owner?"}
          </DialogTitle>
          <DialogDescription>
            {isAlreadyArchived
              ? "This ad owner is already archived."
              : "This will archive the ad owner and remove it from active listings."}
          </DialogDescription>
        </DialogHeader>

        {byIdError ? (
          <div className="text-sm text-red-200 rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
            Failed to fetch owner details. Close and try again.
          </div>
        ) : null}

        <div className="rounded-2xl border bg-background/50 p-3 space-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide opacity-80">
              Name
            </div>
            <div className="text-sm font-medium mt-1">
              {showLoading ? "Loading…" : owner?.name || "—"}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide opacity-80">
              Description
            </div>
            <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words line-clamp-6">
              {showLoading
                ? "Loading…"
                : owner?.description?.trim()
                  ? owner.description
                  : "—"}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wide opacity-80">
              Owner ID
            </div>
            <div className="font-mono text-xs break-all mt-1">{adOwnerId}</div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="rounded-2xl"
          >
            Close
          </Button>

          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending || showLoading || isAlreadyArchived}
            className="rounded-2xl"
            title={
              showLoading
                ? "Fetching owner details..."
                : isAlreadyArchived
                  ? "Already archived"
                  : "Archive this owner"
            }
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Archiving…
              </>
            ) : (
              "Archive"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
