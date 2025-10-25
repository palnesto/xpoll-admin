import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/modals/custom-modal";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { endpoints } from "@/api/endpoints";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/hooks/useApiQuery";

type Props = {
  ids: string[];
  onClose: () => void;
  invalidateKey: string; // the list url to invalidate
};

export function ApproveSellIntentModal({ ids, onClose, invalidateKey }: Props) {
  const { data } = useApiQuery(endpoints.adminMe);
  const internalAccountId = data?.data?.data?.id;
  console.log("internalAccountId", internalAccountId);
  const [txnHash, setTxnHash] = useState<string>("");
  const { mutate, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.actions.createSellApprove,
    method: "POST",
    onSuccess: () => {
      appToast.success(
        ids.length === 1 ? "Sell intent approved" : "Sell intents approved"
      );
      queryClient.invalidateQueries();
      onClose();
    },
    onError: (err: any) => {
      appToast.error(err?.message || "Failed to approve");
    },
  });

  return (
    <CustomModal
      isOpen
      onClose={onClose}
      title="Approve Sell Intent"
      onSubmit={() => {}}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!txnHash) return;
              if (!internalAccountId) {
                appToast.error("internalAccountId not passed");
                return;
              } else if (txnHash.length < 25) {
                appToast.error("Invalid transaction hash");
                console.log("invalid txnHash", txnHash);
                return;
              }
              const actionIds = ids?.map((id) => {
                return {
                  actionId: id,
                  txnHash: txnHash.trim(),
                };
              });
              mutate({
                actionIds,
                internalAccountId,
              });
            }}
            disabled={isPending}
          >
            {isPending ? "Approving…" : "Approve"}
          </Button>
        </div>
      }
    >
      <p className="mb-2">
        Approve {ids.length} sell intent{ids.length > 1 ? "s" : ""}?
      </p>

      <Input
        placeholder="Transaction hash"
        value={txnHash}
        onChange={(e) => {
          setTxnHash(e.target.value);
        }}
        // disabled={isPending}
      />
      <div className="max-h-40 overflow-auto rounded border p-2 text-xs">
        {ids.map((id) => (
          <div key={id} className="font-mono">
            {`Order Id: ${id}`}
          </div>
        ))}
      </div>
    </CustomModal>
  );
}
