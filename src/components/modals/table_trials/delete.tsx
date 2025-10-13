import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { CustomModal } from "@/components/modals/custom-modal";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useSelectedTrials } from "@/pages/analytics/trials";
import { useTableTrialsStore } from "@/stores/table_trials.store";
import { appToast } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { useCallback } from "react";

export function ConfirmDeleteTrialPollsModal({ url }: { url: string }) {
  const isDeleting = useTableTrialsStore((s) => s.isDeleting);
  const onClose = useTableTrialsStore((s) => s.onClose);
  const { mutateAsync: deleteTrialPoll, isPending: isDeletingTrialPoll } =
    useApiMutation({
      route: endpoints.entities.trials.delete,
      method: "DELETE",
      onSuccess: () => {
        appToast.success("Trial Poll deleted");
        if (Array.isArray(isDeleting) && isDeleting.length > 0) {
          useSelectedTrials.getState().removeManyByIds(isDeleting);
        }

        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some(
              (k) => typeof k === "string" && k.toLowerCase().includes("trial")
            ),
        });

        // ✅ Refresh current list view
        queryClient.invalidateQueries({ queryKey: ["trials-advanced"] });
        queryClient.invalidateQueries({
          queryKey: [endpoints.entities.trials.all],
        });
        queryClient.invalidateQueries({ queryKey: [url] });

        onClose();
      },
    });
  const doDelete = useCallback(async () => {
    if (!isDeleting || isDeleting.length < 1) return;
    deleteTrialPoll({
      ids: isDeleting,
    });
  }, [isDeleting, deleteTrialPoll]);

  if (!isDeleting || isDeleting.length < 1) return null;
  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={"Delete Trial Polls"}
      footer={<></>}
      onSubmit={() => {}}
    >
      <p className="mb-4">
        {"Are you sure you want to delete these trial polls?"}
      </p>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isDeletingTrialPoll}
        >
          Cancel
        </Button>
        <Button onClick={doDelete} disabled={isDeletingTrialPoll}>
          {isDeletingTrialPoll && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {"Delete"}
        </Button>
      </div>
    </CustomModal>
  );
}
