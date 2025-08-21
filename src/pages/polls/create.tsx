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
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

const ASSET_OPTIONS = [
  { label: "OCTA", value: "xOcta" },
  { label: "MYST", value: "xMYST" },
  { label: "DROP", value: "xDrop" },
] as const;

const optionZ = z.object({ text: z.string().min(3, "Min 3 chars").trim() });

const resourceAssetZ = z.object({
  type: z.enum(["image", "youtube"]),
  value: z.string().min(1, "Required"),
});

const formSchema = z.object({
  title: z.string().min(3, "Min 3 chars").trim(),
  description: z.string().min(3, "Min 3 chars").trim(),
  options: z
    .array(optionZ)
    .min(2, "Need 2–4 options")
    .max(4, "Need 2–4 options"),
  reward: z
    .object({
      assetId: z.enum(["xOcta", "xMYST", "xDrop"]),
      amount: z.coerce.number().int().min(1, "Min 1"),
      rewardAmountCap: z.coerce.number().int().min(1, "Min 1"),
    })
    .refine((r) => r.rewardAmountCap >= r.amount, {
      path: ["rewardAmountCap"],
      message: "rewardAmountCap must be >= amount",
    }),
  resourceAssets: z.array(resourceAssetZ).default([]),
});

type FormValues = z.infer<typeof formSchema>;

export function extractYouTubeId(input: string) {
  const idLike = /^[\w-]{11}$/;
  try {
    if (idLike.test(input)) return input;
    const u = new URL(input);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return idLike.test(id) ? id : input;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") || "";
      return idLike.test(id) ? id : input;
    }
  } catch {}
  return input;
}

export default function PollCreatePage() {
  const navigate = useNavigate();

  const defaultValues: FormValues = useMemo(
    () => ({
      title: "",
      description: "",
      options: [{ text: "" }, { text: "" }],
      reward: { assetId: ASSET_OPTIONS[0].value, amount: 1 },
      resourceAssets: [],
    }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });
  const { control, handleSubmit, watch } = form;

  const optionsArray = useFieldArray({ control, name: "options" });
  const assetsArray = useFieldArray({ control, name: "resourceAssets" });

  const { mutate, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.polls.create, // POST /poll
    method: "POST",
    onSuccess: () => {
      appToast.success("Poll created");
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.polls.create],
      });
      navigate("/polls");
    },
  });

  const onSubmit = async (v: FormValues) => {
    const normalizedAssets = v.resourceAssets.map((a) => ({
      type: a.type,
      value:
        a.type === "youtube"
          ? extractYouTubeId(a.value.trim())
          : a.value.trim(),
    }));

    const payload = {
      title: v.title,
      description: v.description,
      resourceAssets: normalizedAssets,
      options: v.options.map((o) => ({
        text: o.text.trim(),
        archivedAt: null,
      })),
      rewards: [
        {
          assetId: v.reward.assetId,
          amount: v.reward.amount,
          rewardAmountCap: v.reward.amount,
          currentDistribution: 0,
        },
      ],
      expireRewardAt: null,
    };
    mutate(payload as any);
  };

  const optsArrayMsg =
    (form.formState.errors.options as any)?.message ??
    (form.formState.errors.options as any)?.root?.message;

  return (
    <div className="p-4 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Create Poll</h1>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Title */}
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

          {/* Description */}
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

          {/* Options (array) */}
          <div className="space-y-2">
            <FormLabel>Options (2–4)</FormLabel>
            {optionsArray.fields.map((f, idx) => (
              <div key={f.id} className="flex gap-2 items-end">
                <FormField
                  control={control}
                  name={`options.${idx}.text` as any}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder={`Option #${idx + 1}`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => optionsArray.append({ text: "" })}
                disabled={optionsArray.fields.length >= 4}
              >
                Add Option
              </Button>
              {optsArrayMsg && (
                <p className="text-sm text-destructive">{optsArrayMsg}</p>
              )}
            </div>
          </div>

          {/* Resource Assets (array) */}
          <div className="space-y-2">
            <FormLabel>Media (Images / YouTube) – optional</FormLabel>
            {assetsArray.fields.map((f, idx) => {
              const typeName = `resourceAssets.${idx}.type` as const;
              const valueName = `resourceAssets.${idx}.value` as const;
              const currentType = watch(typeName);

              return (
                <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <FormField
                      control={control}
                      name={typeName as any}
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-xs">Type</label>
                          <FormControl>
                            <select
                              className="w-full h-9 border rounded-md px-2 bg-transparent"
                              {...field}
                            >
                              <option value="image">IMAGE</option>
                              <option value="youtube">YOUTUBE</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-7">
                    <FormField
                      control={control}
                      name={valueName as any}
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-xs">
                            {currentType === "youtube"
                              ? "YouTube URL or ID"
                              : "Image URL"}
                          </label>
                          <FormControl>
                            <Input
                              placeholder={
                                currentType === "youtube"
                                  ? "https://youtube.com/watch?v=… or 11-char ID"
                                  : "https://example.com/pic.jpg"
                              }
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => assetsArray.remove(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => assetsArray.append({ type: "image", value: "" })}
              >
                + Image
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  assetsArray.append({ type: "youtube", value: "" })
                }
              >
                + YouTube
              </Button>
            </div>
          </div>

          {/* Reward */}
          <div className="space-y-2">
            <FormLabel>Reward</FormLabel>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <FormField
                  control={control}
                  name="reward.assetId"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-xs">Asset</label>
                      <FormControl>
                        <select
                          className="w-full h-9 border rounded-md px-2 bg-transparent"
                          {...field}
                        >
                          {ASSET_OPTIONS?.map((o) => (
                            <option
                              key={o?.value}
                              value={o?.value}
                              className="bg-gray-900"
                            >
                              {o?.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-4">
                <FormField
                  control={control}
                  name="reward.amount"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-xs">Amount per person</label>
                      <FormControl>
                        <Input type="number" min={1} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-4">
                <FormField
                  control={control}
                  name="reward.rewardAmountCap"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-xs">Reward Amount Cap</label>
                      <FormControl>
                        <Input type="number" min={1} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending}>
              Create
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
