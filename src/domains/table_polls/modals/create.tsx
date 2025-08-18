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
import { queryClient } from "@/api/queryClient";
import { useCallback } from "react";
import { useTablePollsStore } from "@/stores/table_polls.store";
import { endpoints } from "@/api/endpoints";

const formSchema = z.object({
  poll_name: z.string().min(1, { message: "Poll Name is required" }),
  designation: z.string().min(1, { message: "Designation is required" }),
  remark: z.string().min(1, { message: "Remark is required" }),
});

export const CreateTablePollsModal = () => {
  const onClose = useTablePollsStore((state) => state.onClose);
  const {
    mutate: tablePollsCreateMutate,
    isPending: isTablePollsCreatePending,
  } = useApiMutation({
    route: endpoints.entities.polls.all,
    method: "POST",
    onSuccess: (data) => {
      if (data?.statusCode === 201) {
        appToast.success("Polls created successfully");
        queryClient.invalidateQueries();
        onClose();
      }
    },
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { poll_name: "", designation: "", remark: "" },
  });
  const onSubmit = useCallback(
    (values: z.infer<typeof formSchema>) => {
      tablePollsCreateMutate(values);
    },
    [tablePollsCreateMutate]
  );
  return (
    <CustomModal
      isOpen={true}
      onClose={onClose}
      title="Create Table Polls"
      submitButtonText="Create"
      onSubmit={() => {}}
      footer={<></>}
      needX={true}
    >
      <div className="w-full flex flex-col gap-3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="poll_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poll Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Poll Name" {...field} />
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
              <Button disabled={isTablePollsCreatePending} type="submit">
                {isTablePollsCreatePending && (
                  <Loader2 className="animate-spin" />
                )}
                Create
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </CustomModal>
  );
};
