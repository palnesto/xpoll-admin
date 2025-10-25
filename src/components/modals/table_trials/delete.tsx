import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { CustomModal } from "@/components/modals/custom-modal";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useSelectedTrials } from "@/pages/analytics/trials";
import { useTableTrialsStore } from "@/stores/table_trials.store";
import { trimUrl } from "@/utils/formatter";
import { appToast } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";

export function ConfirmDeleteTrialPollsModal({ url }: { url: string }) {
  const selectedApi = useSelectedTrials();
  const clearAll = () => selectedApi.clear();

  const isDeleting = useTableTrialsStore((s) => s.isDeleting);
  const onClose = useTableTrialsStore((s) => s.onClose);

  const ids = useMemo(
    () => (isDeleting ?? []).map((x) => x.trialId),
    [isDeleting]
  );

  const { mutateAsync: deleteTrialPoll, isPending: isDeletingTrialPoll } =
    useApiMutation({
      route: endpoints.entities.trials.delete,
      method: "DELETE",
      onSuccess: () => {
        appToast.success("Trail(s) archived");
        if (Array.isArray(isDeleting) && isDeleting.length > 0) {
          useSelectedTrials.getState().removeManyByIds(isDeleting);
        }

        const trimmed = trimUrl(url);
        queryClient.invalidateQueries({ queryKey: ["GET", url] });
        queryClient.invalidateQueries({ queryKey: [url] });
        queryClient.invalidateQueries({ queryKey: [trimmed] });
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = String(q.queryKey?.[0] ?? "");
            return (
              key.includes("/internal/trial/list") ||
              key.includes("/internal/trial/advanced-listing")
            );
          },
        });
        queryClient.invalidateQueries();
        clearAll();
        onClose();
      },
    });

  const doDelete = useCallback(async () => {
    console.log("delete ids", ids);
    if (!ids.length) return;
    await deleteTrialPoll({ ids });
  }, [ids, deleteTrialPoll]);

  if (!isDeleting || isDeleting.length < 1) return null;

  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={"Archive Trails"}
      footer={<></>}
      onSubmit={() => {}}
    >
      <div className="space-y-4">
        <p>
          Are you sure you want to archive{" "}
          <span className="font-semibold">{isDeleting.length}</span>{" "}
          {isDeleting.length === 1 ? "trail" : "trails"}?
        </p>

        {/* Mini Table (shadcn style) */}
        <div className="border rounded-lg flex flex-col max-h-[300px]">
          {/* Header row */}
          <div className="bg-muted text-muted-foreground border-b px-3 py-2 flex">
            <div className="w-2/3 font-medium">Title</div>
            <div className="flex-1 font-medium pl-3">Trail ID</div>
          </div>

          {/* Scrollable table body */}
          <div className="overflow-y-auto flex-1">
            <Table>
              <TableBody>
                {isDeleting.map((trial) => (
                  <TableRow key={trial?.trialId} className="hover:bg-muted/50">
                    <TableCell className="w-2/3 font-medium">
                      {trial.title || "(untitled)"}
                    </TableCell>
                    <TableCell className="flex-1 text-muted-foreground font-mono text-xs">
                      {trial?.trialId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeletingTrialPoll}
          >
            Cancel
          </Button>
          <Button
            variant={"destructive"}
            onClick={doDelete}
            disabled={isDeletingTrialPoll}
          >
            {isDeletingTrialPoll && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Archive
          </Button>
        </div>
      </div>
    </CustomModal>
  );
}
