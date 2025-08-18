import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useParams, useNavigate } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { useEffect } from "react";

const optionZ = z.object({
  _id: z.string().optional(),
  text: z.string().min(3, "Min 3 chars").trim(),
});

const formSchema = z.object({
  title: z.string().min(3, "Min 3 chars").trim(),
  description: z.string().min(3, "Min 3 chars").trim(),
  options: z
    .array(optionZ)
    .min(2, "Need 2–4 options")
    .max(4, "Need 2–4 options"),
  reward: z.object({
    assetId: z.enum(["OCTA", "MYST", "DROP"]),
    amount: z.coerce.number().int().min(1, "Min 1"),
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function PollEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useApiQuery(
    `${endpoints.entities.polls.all}/${id}`
  );
  const poll = data?.data?.data;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      options: [{ text: "" }, { text: "" }],
      reward: { assetId: "OCTA", amount: 1 },
    },
    mode: "onChange",
  });

  const { control, handleSubmit, register, reset } = form;
  const optionsArray = useFieldArray({ control, name: "options" });

  // hydrate form when poll loads
  useEffect(() => {
    if (!poll) return;
    const firstReward = (poll.rewards && poll.rewards[0]) || {
      assetId: "OCTA",
      amount: 1,
      currentDistribution: 0,
    };
    reset({
      title: poll.title ?? "",
      description: poll.description ?? "",
      options: (poll.options ?? []).map((o: any) => ({
        _id: o._id,
        text: o.text ?? "",
      })),
      reward: {
        assetId: firstReward.assetId ?? "OCTA",
        amount: firstReward.amount ?? 1,
      },
    });
  }, [poll, reset]);

  const { mutateAsync, isPending } = useApiMutation<any, any>({
    route: `${endpoints.entities.polls.all}/${id}`,
    method: "PATCH",
    onSuccess: () => {
      appToast.success("Poll updated");
      queryClient.invalidateQueries();
      navigate("/polls");
    },
  });

  const onSubmit = async (v: FormValues) => {
    // preserve currentDistribution if present; clamp to new cap (= amount)
    const existingCD =
      poll?.rewards && poll.rewards[0]?.currentDistribution
        ? Number(poll.rewards[0].currentDistribution)
        : 0;
    const cappedCD = Math.min(existingCD, Number(v.reward.amount));

    const payload = {
      title: v.title,
      description: v.description,
      options: v.options.map((o) => ({
        _id: o._id, // keep for server to know which option
        text: o.text,
        archivedAt: null,
      })),
      rewards: [
        {
          assetId: v.reward.assetId,
          amount: v.reward.amount,
          rewardAmountCap: v.reward.amount,
          currentDistribution: cappedCD,
        },
      ],
    };
    await mutateAsync(payload as any);
  };

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (!poll) return <div className="p-4">Not found</div>;

  return (
    <div className="p-4 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Edit Poll</h1>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Poll title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Short description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Options (2–4)</FormLabel>
            {optionsArray.fields.map((f, idx) => (
              <div key={f.id} className="flex gap-2 items-end">
                <Input
                  placeholder={`Option #${idx + 1}`}
                  {...register(`options.${idx}.text` as const)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => optionsArray.remove(idx)}
                  disabled={optionsArray.fields.length <= 2}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => optionsArray.append({ text: "" })}
              disabled={optionsArray.fields.length >= 4}
            >
              Add Option
            </Button>
            <FormMessage />
          </div>

          <div className="space-y-2">
            <FormLabel>Reward</FormLabel>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <label className="text-xs">Asset</label>
                <select
                  className="w-full h-9 border rounded-md px-2 bg-transparent"
                  {...register("reward.assetId")}
                >
                  <option value="OCTA">OCTA</option>
                  <option value="MYST">MYST</option>
                  <option value="DROP">DROP</option>
                </select>
              </div>
              <div className="col-span-4">
                <label className="text-xs">Amount</label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  {...register("reward.amount", { valueAsNumber: true })}
                />
              </div>
            </div>
            <FormMessage />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending}>
              Update
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
