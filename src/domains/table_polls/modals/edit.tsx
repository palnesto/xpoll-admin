import { queryClient } from "@/api/queryClient";
import { CustomModal } from "@/components/modals/custom-modal";
import { useApiMutation } from "@/hooks/useApiMutation";
import { appToast } from "@/utils/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCallback, useEffect } from "react";
import { useTablePollsStore } from "@/stores/table_polls.store";
import { endpoints } from "@/api/endpoints";

const formSchema = z.object({
  member_name: z.string().min(1, { message: "Member Name is required" }),
  designation: z.string().min(1, { message: "Designation is required" }),
  remark: z.string().min(1, { message: "Remark is required" }),
});

export const EditTablePollsModal = () => {
  const onClose = useTablePollsStore((state) => state.onClose);
  const isEditing = useTablePollsStore((state) => state.isEditing);
  const { data, isPending: isDataFetching } = useApiQuery(
    endpoints.entities.polls.one(isEditing ?? "")
  );
  const { mutate: tablePollsEditMutate, isPending: isTablePollsEditPending } =
    useApiMutation({
      route: endpoints.entities.polls.one(isEditing ?? ""),
      method: "PATCH",
      onSuccess: (data) => {
        if (data?.statusCode === 200) {
          appToast.success("Row updated successfully");
          queryClient.invalidateQueries();
          onClose();
        }
      },
    });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { member_name: "", designation: "", remark: "" },
  });
  const onSubmit = useCallback(
    (values: z.infer<typeof formSchema>) => {
      tablePollsEditMutate(values);
    },
    [tablePollsEditMutate]
  );
  const { reset } = form;
  useEffect(() => {
    const body = {
      ...(data?.data?.data?.member_name
        ? { member_name: data?.data?.data?.member_name }
        : {}),
      ...(data?.data?.data?.designation
        ? { designation: data?.data?.data?.designation }
        : {}),
      ...(data?.data?.data?.remark ? { remark: data?.data?.data?.remark } : {}),
    };
    reset(body);
  }, [data, reset]);
  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title={`Edit Table Polls Row (${isEditing})`}
      submitButtonText="Update"
      onSubmit={() => {}}
      footer={<></>}
      needX={true}
    >
      {isDataFetching && <Loader2 className="animate-spin" />}
      {!isDataFetching && (
        <div className="w-full flex flex-col gap-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="member_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Member Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Designation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Remark" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button disabled={isTablePollsEditPending} type="submit">
                  {isTablePollsEditPending && (
                    <Loader2 className="animate-spin" />
                  )}
                  Update
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </CustomModal>
  );
};
