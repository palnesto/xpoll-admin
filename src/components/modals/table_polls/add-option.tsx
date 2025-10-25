import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomModal } from "@/components/modals/custom-modal";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { usePollViewStore } from "@/stores/poll_view.store";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { endpoints } from "@/api/endpoints";
import { optionTextZod } from "@/validators/poll-trial-form";

const AddSchema = z.object({ text: optionTextZod });
type FormVals = z.infer<typeof AddSchema>;

export const AddOptionModal = () => {
  const isAddOption = usePollViewStore((s) => s.isAddOption);
  const onClose = usePollViewStore((s) => s.onClose);

  const form = useForm<FormVals>({
    resolver: zodResolver(AddSchema),
    defaultValues: { text: "" },
    mode: "onChange",
  });

  const { mutate: addOption, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.polls.edit.addOption,
    method: "POST",
    onSuccess: (resp) => {
      appToast.success("Option added");

      queryClient.invalidateQueries();
      onClose();
    },
  });

  const handleOnSubmit = form.handleSubmit((v) => {
    const payload = {
      pollId: isAddOption?.pollId,
      text: v.text.trim(),
    };
    addOption(payload);
  });

  if (!isAddOption) return null;

  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title="Add option"
      onSubmit={() => {}}
      footer={<></>}
    >
      <form onSubmit={handleOnSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Option text</label>
          <Input
            {...form.register("text")}
            placeholder="Type option…"
            autoFocus
            disabled={isPending}
          />
          {form.formState.errors.text?.message && (
            <p className="text-xs text-destructive">
              {form.formState.errors.text.message}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleOnSubmit}
            disabled={isPending || !form.formState.isValid}
          >
            Add
          </Button>
        </div>
      </form>
    </CustomModal>
  );
};
