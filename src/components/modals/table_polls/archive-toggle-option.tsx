import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/modals/custom-modal";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { usePollViewStore } from "@/stores/poll_view.store";
import { endpoints } from "@/api/endpoints";

// function patchShowCache(showKey: string, updater: (curr: any) => any) {
//   const prev = queryClient.getQueryData<any>([showKey]);
//   if (!prev) return;
//   const lvl1 = prev?.data ?? {};
//   const curr = lvl1?.data && typeof lvl1.data === "object" ? lvl1.data : lvl1;
//   const nextCurr = updater(curr);
//   const next = lvl1?.data
//     ? { ...prev, data: { ...lvl1, data: nextCurr } }
//     : { ...prev, data: nextCurr };
//   queryClient.setQueryData([showKey], next);
// }

export const ArchiveToggleOptionModal = () => {
  const isArchiveToggleOption = usePollViewStore(
    (s) => s.isArchiveToggleOption
  );
  const onClose = usePollViewStore((s) => s.onClose);

  const { mutate: toggleArchive, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.polls.edit.toggleOption,
    method: "PATCH",
    onSuccess: (resp) => {
      appToast.success("Option removed");

      // const serverOptions =
      //   resp?.data?.data?.options ?? resp?.data?.options ?? resp?.options;
      // if (Array.isArray(serverOptions)) {
      //   patchShowCache(showKey, (curr) => ({
      //     ...curr,
      //     options: serverOptions,
      //   }));
      // } else if (optionId) {
      //   patchShowCache(showKey, (curr) => ({
      //     ...curr,
      //     options: (curr?.options ?? []).map((o: any) =>
      //       o._id === optionId
      //         ? { ...o, archivedAt: new Date().toISOString() }
      //         : o
      //     ),
      //   }));
      // }

      queryClient.invalidateQueries();
      onClose();
    },
  });

  const handleOnSubmit = () => {
    console.log("reaching submit", isArchiveToggleOption);
    const payload = {
      pollId: isArchiveToggleOption?.pollId,
      optionId: isArchiveToggleOption?.optionId,
      archived: isArchiveToggleOption?.shouldArchive,
    };
    console.log("payload", payload);
    toggleArchive(payload);
  };

  if (!isArchiveToggleOption) return null;

  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={
        isArchiveToggleOption?.shouldArchive
          ? "Archive Option"
          : "Unarchive Option"
      }
      onSubmit={() => {}}
      footer={<></>}
    >
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="button" disabled={isPending} onClick={handleOnSubmit}>
          {isArchiveToggleOption?.shouldArchive ? "Archive" : "Unarchive"}
        </Button>
      </div>
    </CustomModal>
  );
};
