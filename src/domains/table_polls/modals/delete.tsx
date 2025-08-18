import { CustomModal } from "@/components/modals/custom-modal";
import { useApiMutation } from "@/hooks/useApiMutation";
import { appToast } from "@/utils/toast";
import { queryClient } from "@/api/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCallback } from "react";
import { endpoints } from "@/api/endpoints";
import { useTablePollsStore } from "@/stores/table_polls.store";

export const DeleteTablePollsModal = () => {
  const onClose = useTablePollsStore((state) => state.onClose);
  const isDeleting = useTablePollsStore((state) => state.isDeleting);
  const {
    mutate: tablePollsDeleteMutate,
    isPending: isTablePollsDeletePending,
  } = useApiMutation({
    route: endpoints.entities.polls.delete(isDeleting ?? ""),
    method: "DELETE",
    onSuccess: (data) => {
      if (data?.statusCode === 200) {
        appToast.success("Row deleted successfully");
        queryClient.invalidateQueries();
        onClose();
      }
    },
  });
  const onSubmit = useCallback(() => {
    tablePollsDeleteMutate({});
  }, [tablePollsDeleteMutate]);
  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={`Delete Table Polls Row (${isDeleting})`}
      submitButtonText="Delete"
      isSubmitting={isTablePollsDeletePending}
      onSubmit={() => {}}
      footer={<></>}
      needX={true}
    >
      <p>Are you sure you want to delete this row?</p>
      <div className="flex justify-end">
        <Button
          disabled={isTablePollsDeletePending}
          type="button"
          onClick={onSubmit}
        >
          {isTablePollsDeletePending && <Loader2 className="animate-spin" />}
          Delete
        </Button>
      </div>
    </CustomModal>
  );
};
