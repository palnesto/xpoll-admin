import { Input } from "@/components/ui/input";
import { CustomModal } from "@/components/modals/custom-modal";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { usePollViewStore } from "@/stores/poll_view.store";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";

const EditSchema = z.object({ text: z.string().trim().min(3, "Required") });
type FormVals = z.infer<typeof EditSchema>;

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

export const EditOptionModal = () => {
  const isEditOption = usePollViewStore((s) => s.isEditOption);
  const onClose = usePollViewStore((s) => s.onClose);

  const form = useForm<FormVals>({
    resolver: zodResolver(EditSchema),
    defaultValues: { text: isEditOption?.oldText ?? "" },
    mode: "onChange",
  });

  const { mutate: updateOption, isPending } = useApiMutation<any, any>({
    route: "/poll/options",
    method: "PUT",
    onSuccess: (resp) => {
      appToast.success("Option updated");

      // const serverOptions =
      //   resp?.data?.data?.options ?? resp?.data?.options ?? resp?.options;

      // if (Array.isArray(serverOptions)) {
      //   patchShowCache(showKey, (curr) => ({
      //     ...curr,
      //     options: serverOptions,
      //   }));
      // } else if (editData) {
      //   const newText = form.getValues("text").trim();
      //   patchShowCache(showKey, (curr) => ({
      //     ...curr,
      //     options: (curr?.options ?? []).map((o: any) =>
      //       o._id === editData.optionId ? { ...o, text: newText } : o
      //     ),
      //   }));
      // }

      queryClient.invalidateQueries();
      onClose();
    },
  });

  const handleOnSubmit = form.handleSubmit((v) => {
    console.log("reaching submit", v, isEditOption);
    const payload = {
      pollId: isEditOption?.pollId,
      optionId: isEditOption?.optionId,
      text: v.text.trim(),
    };
    console.log("payload", payload);
    updateOption(payload);
  });

  if (!isEditOption) return null;

  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title="Edit option"
      onSubmit={() => {}}
      footer={<></>}
    >
      <form onSubmit={handleOnSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Option text</label>
          <Input
            {...form.register("text")}
            placeholder="Edit option…"
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
            Edit
          </Button>
        </div>
      </form>
    </CustomModal>
  );
};
