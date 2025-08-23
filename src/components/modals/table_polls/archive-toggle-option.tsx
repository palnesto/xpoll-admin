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
    route: endpoints.entities.polls.edit.toggleOption,
    method: "PATCH",
    onSuccess: (resp) => {
      appToast.success("Option removed");

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
