// src/components/modals/ad/ad/delete.tsx

import { useMemo } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  adId: string;
  onArchived?: () => void;
};

export default function ConfirmArchiveAdModal({
  isOpen,
  onClose,
  adId,
  onArchived,
}: Props) {
  const archiveRoute = useMemo(() => {
    // uses your existing ad edit route
    return endpoints.entities.ad.ad.edit(adId);
  }, [adId]);

  const { mutateAsync, isPending } = useApiMutation<any, any>({
    route: archiveRoute,
    method: "DELETE",
    onSuccess: () => {
      appToast.success("Ad archived");
      queryClient.invalidateQueries();
      onClose();
      onArchived?.();
    },
    onError: (err: Error) => {
      console.log("archive ad error", err);
      appToast.error("Failed to archive ad");
    },
  });

  const onConfirm = async () => {
    return mutateAsync({}).catch(() => undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/25">
              <AlertTriangle className="h-4 w-4 text-red-300" />
            </span>
            Archive this ad?
          </DialogTitle>
          <DialogDescription>
            This will archive the ad and hide it from normal listings (unless
            includeArchived is enabled).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border bg-background/50 p-3 text-xs text-muted-foreground">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide opacity-80">
                Ad ID
              </div>
              <div className="font-mono break-all text-foreground/90 mt-1">
                {adId}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="rounded-2xl"
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-2xl"
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
