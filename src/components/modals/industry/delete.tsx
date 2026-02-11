// src/components/modals/industry/delete.tsx
import { useCallback, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { CustomModal } from "@/components/modals/custom-modal";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { appToast } from "@/utils/toast";

type Industry = {
  _id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  industryId: string;
};

export default function ConfirmArchiveIndustryModal({
  isOpen,
  onClose,
  industryId,
}: Props) {
  const getUrl = useMemo(() => {
    if (!industryId) return "";
    return endpoints.entities.industry.getById(
      { industryId },
      { includeArchived: "true" },
    );
  }, [industryId]);

  const {
    data: byIdData,
    isLoading: isLoadingById,
    isFetching: isFetchingById,
    error: byIdError,
    refetch,
  } = useApiQuery(getUrl, {
    key: ["industry-by-id", industryId, getUrl],
    enabled: !!industryId && isOpen,
  } as any);

  useEffect(() => {
    if (!isOpen) return;
    try {
      (refetch as any)?.();
    } catch {}
  }, [isOpen, getUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const industry: Industry | null = (byIdData as any)?.data?.data ?? null;

  const isDetailsReady = !!industry?._id && !isLoadingById && !isFetchingById;
  const isAlreadyArchived = !!industry?.archivedAt;

  const { mutateAsync, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.industry.delete(industryId),
    method: "DELETE",
    onSuccess: () => {
      appToast.success("Industry archived");

      const viewUrl = endpoints.entities.industry.getById(
        { industryId },
        { includeArchived: "true" },
      );

      queryClient.invalidateQueries({ queryKey: ["GET", viewUrl] });
      queryClient.invalidateQueries({ queryKey: [viewUrl] });

      queryClient.invalidateQueries({
        predicate: (q) => {
          const key0 = String(q.queryKey?.[0] ?? "");
          return (
            key0.includes("/internal/industry/advanced-listing") ||
            key0.includes("/internal/industry/")
          );
        },
      });

      onClose();
    },
    onError: (e: any) => {
      appToast.error(e?.message ?? "Failed to archive industry");
    },
  });

  const doArchive = useCallback(async () => {
    if (!industryId) return;
    await mutateAsync(undefined as any);
  }, [industryId, mutateAsync]);

  if (!isOpen) return null;

  const showLoading = !!industryId && (isLoadingById || isFetchingById);

  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={isAlreadyArchived ? "Industry Archived" : "Archive Industry"}
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
            Failed to fetch industry details. Please close and try again.
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          {isAlreadyArchived
            ? "This industry is already archived."
            : "This action will archive the industry and remove it from active listings."}
        </p>

        <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Name</div>
            <div className="text-sm font-medium">
              {isDetailsReady ? industry?.name || "—" : "Loading..."}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Description</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
              {isDetailsReady
                ? industry?.description?.trim()
                  ? industry.description
                  : "—"
                : "Loading..."}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Industry ID</div>
            <div className="font-mono text-xs break-all">{industryId}</div>
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
                ? "Fetching industry details..."
                : isAlreadyArchived
                  ? "Already archived"
                  : "Archive this industry"
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
