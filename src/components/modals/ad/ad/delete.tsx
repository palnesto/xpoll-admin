// src/components/modals/ad/ad/delete.tsx

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

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
    // ✅ uses your existing ad edit route
    return endpoints.entities.ad.ad.edit(adId);
  }, [adId]);

  const { mutateAsync, isPending } = useApiMutation<any, any>({
    route: archiveRoute,
    method: "DELETE",
    onSuccess: () => {
      appToast.success("Ad archived");
      // refresh ad list + this ad view
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
    // ✅ backend typical patch payload; adjust if your controller expects something else
    return mutateAsync({}).catch(() => undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Archive this ad?</DialogTitle>
          <DialogDescription>
            This will archive the ad and hide it from normal listings (unless
            includeArchived is enabled).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border p-3 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Ad ID:</span>{" "}
            <span className="font-mono break-all">{adId}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
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
