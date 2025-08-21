import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { CustomModal } from "@/components/modals/custom-modal";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useTablePollsStore } from "@/stores/table_polls.store";
import { appToast } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { useCallback } from "react";

export function ConfirmDeletePollsModal({ url }: { url: string }) {
  const isDeleting = useTablePollsStore((s) => s.isDeleting);
  const onClose = useTablePollsStore((s) => s.onClose);
  const { mutateAsync: deletePoll, isPending: isDeletingPoll } = useApiMutation(
    {
      route: endpoints.entities.polls.delete,
      method: "DELETE",
      onSuccess: () => {
        appToast.success("Poll deleted");
        // Refresh current list page
        queryClient.invalidateQueries({ queryKey: [url] });
        onClose();
      },
    }
  );
  const doDelete = useCallback(async () => {
    if (!isDeleting || isDeleting.length < 1) return;
    deletePoll({
      ids: isDeleting,
    });
  }, [isDeleting, deletePoll]);

  if (!isDeleting || isDeleting.length < 1) return null;
  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={"Delete Polls"}
      footer={<></>}
      onSubmit={() => {}}
    >
      <p className="mb-4">{"Are you sure you want to delete these polls?"}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isDeletingPoll}>
          Cancel
        </Button>
        <Button onClick={doDelete} disabled={isDeletingPoll}>
          {isDeletingPoll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {"Delete"}
        </Button>
      </div>
    </CustomModal>
  );
}
