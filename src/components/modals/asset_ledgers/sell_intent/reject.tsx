import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/modals/custom-modal";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { endpoints } from "@/api/endpoints";

type Props = {
  ids: string[];
  onClose: () => void;
  invalidateKey: string; // the list url to invalidate
};

export function RejectSellIntentModal({ ids, onClose, invalidateKey }: Props) {
  const { mutate, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.actions.createSellReject,
    method: "POST",
    onSuccess: () => {
      appToast.success(
        ids.length === 1 ? "Sell intent rejected" : "Sell intents rejected"
      );
      queryClient.invalidateQueries();
      onClose();
    },
    onError: (err: any) => {
      appToast.error(err?.message || "Failed to reject");
    },
  });

  return (
    <CustomModal
      isOpen
      onClose={onClose}
      title="Reject Sell Intent"
      onSubmit={() => {}}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutate({ actionIds: ids })}
            disabled={isPending}
          >
            {isPending ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      }
    >
      <p className="mb-2">
        Reject {ids.length} sell intent{ids.length > 1 ? "s" : ""}?
      </p>
      <div className="max-h-40 overflow-auto rounded border p-2 text-xs">
        {ids.map((id) => (
          <div key={id} className="font-mono">
            {id}
          </div>
        ))}
      </div>
    </CustomModal>
  );
}
