import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/modals/custom-modal";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { usePollViewStore } from "@/stores/poll_view.store";
import { endpoints } from "@/api/endpoints";

export const ArchiveToggleOptionModal = () => {
  const isArchiveToggleOption = usePollViewStore(
    (s) => s.isArchiveToggleOption
  );
  const onClose = usePollViewStore((s) => s.onClose);

  const { mutate: toggleArchive, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.polls.edit.toggleArchiveOption,
    method: "PATCH",
    onSuccess: (resp) => {
      const responseArchivedAt = resp?.data?.option?.archivedAt;
      console.log("responseArchivedAt", responseArchivedAt);
      appToast.success(
        responseArchivedAt ? "Option archived" : "Option unarchived"
      );
      queryClient.invalidateQueries();
      onClose();
    },
  });

  const handleOnSubmit = () => {
    const payload = {
      pollId: isArchiveToggleOption?.pollId,
      optionId: isArchiveToggleOption?.optionId,
      archived: isArchiveToggleOption?.shouldArchive,
    };
    toggleArchive(payload);
  };

  if (!isArchiveToggleOption) return null;

  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={
        isArchiveToggleOption?.shouldArchive
          ? `Archive Option (${isArchiveToggleOption?.optionId})`
          : `Unarchive Option (${isArchiveToggleOption?.optionId})`
      }
      onSubmit={() => {}}
      footer={<></>}
    >
      <div className="flex flex-col w-full gap-5">
        <p className="text-white">
          Option:{" "}
          <span className="text-zinc-400">
            {isArchiveToggleOption?.optionText}
          </span>
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size={"sm"}
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size={"sm"}
            disabled={isPending}
            onClick={handleOnSubmit}
          >
            {isArchiveToggleOption?.shouldArchive ? "Archive" : "Unarchive"}
          </Button>
        </div>
      </div>
    </CustomModal>
  );
};
