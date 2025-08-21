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

const AddSchema = z.object({ text: z.string().trim().min(3, "Required") });
type FormVals = z.infer<typeof AddSchema>;

function patchShowCache(showKey: string, updater: (curr: any) => any) {
  const prev = queryClient.getQueryData<any>([showKey]);
  if (!prev) return;
  const lvl1 = prev?.data ?? {};
  const curr = lvl1?.data && typeof lvl1.data === "object" ? lvl1.data : lvl1;
  const nextCurr = updater(curr);
  const next = lvl1?.data
    ? { ...prev, data: { ...lvl1, data: nextCurr } }
    : { ...prev, data: nextCurr };
  queryClient.setQueryData([showKey], next);
}

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

      // const serverOptions =
      //   resp?.data?.data?.options ?? resp?.data?.options ?? resp?.options;

      // if (Array.isArray(serverOptions)) {
      //   patchShowCache(showKey, (curr) => ({
      //     ...curr,
      //     options: serverOptions,
      //   }));
      // } else {
      //   const text = form.getValues("text").trim();
      //   patchShowCache(showKey, (curr) => ({
      //     ...curr,
      //     options: [
      //       ...(curr?.options ?? []),
      //       { _id: crypto.randomUUID(), text, archivedAt: null },
      //     ],
      //   }));
      // }

      queryClient.invalidateQueries();
      onClose();
    },
  });

  const handleOnSubmit = form.handleSubmit((v) => {
    console.log("reaching submit", v, isAddOption);
    const payload = {
      pollId: isAddOption?.pollId,
      text: v.text.trim(),
    };
    console.log("payload", payload);
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
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !form.formState.isValid}>
            Add
          </Button>
        </div>
      </form>
    </CustomModal>
  );
};
