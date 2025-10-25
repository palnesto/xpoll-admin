import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { CustomModal } from "@/components/modals/custom-modal";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useTablePollsStore } from "@/stores/table_polls.store";
import { appToast } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { trimUrl } from "@/utils/formatter";
import { useSelectedPolls } from "@/pages/analytics/polls";

export function ConfirmDeletePollsModal({ url }: { url: string }) {
  const selectedApi = useSelectedPolls();
  const clearAll = () => selectedApi.clear();

  const isDeleting = useTablePollsStore((s) => s.isDeleting);
  const onClose = useTablePollsStore((s) => s.onClose);

  const ids = useMemo(
    () => (isDeleting ?? []).map((x) => x.pollId),
    [isDeleting]
  );

  const { mutateAsync: deletePoll, isPending: isDeletingPoll } = useApiMutation(
    {
      route: endpoints.entities.polls.delete,
      method: "DELETE",
      onSuccess: () => {
        appToast.success("Poll(s) archived");

        const trimmed = trimUrl(url);
        queryClient.invalidateQueries({ queryKey: ["GET", url] });
        queryClient.invalidateQueries({ queryKey: [url] });
        queryClient.invalidateQueries({ queryKey: [trimmed] });
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = String(q.queryKey?.[0] ?? "");
            return (
              key.includes("/internal/poll/list") ||
              key.includes("/internal/poll/advanced-listing")
            );
          },
        });
        queryClient.invalidateQueries();
        clearAll();
        onClose();
      },
    }
  );

  const doDelete = useCallback(async () => {
    if (!ids.length) return;
    await deletePoll({ ids });
  }, [ids, deletePoll]);

  if (!isDeleting || isDeleting.length < 1) return null;

  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={"Archive Polls"}
      footer={<></>}
      onSubmit={() => {}}
    >
      <div className="space-y-4">
        <p>
          Are you sure you want to archive{" "}
          <span className="font-semibold">{isDeleting.length}</span>{" "}
          {isDeleting.length === 1 ? "poll" : "polls"}?
        </p>

        {/* Mini Table (shadcn style) */}
        <div className="border rounded-lg flex flex-col max-h-[300px]">
          {/* Header row */}
          <div className="bg-muted text-muted-foreground border-b px-3 py-2 flex">
            <div className="w-2/3 font-medium">Title</div>
            <div className="flex-1 font-medium pl-3">Poll ID</div>
          </div>

          {/* Scrollable table body */}
          <div className="overflow-y-auto flex-1">
            <Table>
              <TableBody>
                {isDeleting.map((poll) => (
                  <TableRow key={poll.pollId} className="hover:bg-muted/50">
                    <TableCell className="w-2/3 font-medium">
                      {poll.title || "(untitled)"}
                    </TableCell>
                    <TableCell className="flex-1 text-muted-foreground font-mono text-xs">
                      {poll.pollId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isDeletingPoll}>
            Cancel
          </Button>
          <Button
            variant={"destructive"}
            onClick={doDelete}
            disabled={isDeletingPoll}
          >
            {isDeletingPoll && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Archive
          </Button>
        </div>
      </div>
    </CustomModal>
  );
}
