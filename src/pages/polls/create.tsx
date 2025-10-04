import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import ExpireRewardAtPicker from "@/components/polling/editors/ExpireRewardAtPicker";
import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
import TargetGeoEditor from "@/components/polling/editors/TargetGeoEditor";
import OptionsEditor from "@/components/polling/editors/OptionsEditor";
import { extractYouTubeId } from "@/utils/youtube";
import { FormInput } from "@/components/form/input";
import { FormTextarea } from "@/components/form/textarea";
import { FormCard } from "@/components/form/form-card";
import RewardsList from "@/components/polling/editors/RewardsList";
import RewardDetailPanel from "@/components/polling/editors/RewardDetailPanel";
import TwoPane from "@/layouts/TwoPane";

/* =========================================================
   Constants
   ========================================================= */
const TOTAL_LEVELS = 10 as const;
const ASSET_OPTIONS = [
  { label: "OCTA", value: "xOcta" },
  { label: "MYST", value: "xMYST" },
  { label: "DROP", value: "xDrop" },
  { label: "XPOLL", value: "xPoll" },
] as const;

/* =========================================================
   Zod Schema
   ========================================================= */
const optionZ = z.object({ text: z.string().min(3).trim() });
const rewardRowZ = z
  .object({
    assetId: z.enum(["xOcta", "xMYST", "xDrop", "xPoll"]),
    amount: z.coerce.number().int().min(1),
    rewardAmountCap: z.coerce.number().int().min(1),
    rewardType: z.enum(["max", "min"]).default("max"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    message: "Cap must be ≥ amount",
    path: ["rewardAmountCap"],
  });

const resourceAssetFormZ = z.union([
  z.object({ type: z.literal("youtube"), value: z.string().min(11) }),
  z.object({
    type: z.literal("image"),
    value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
  }),
]);

const formSchema = z
  .object({
    title: z.string().min(3).trim(),
    description: z.string().min(3).trim(),
    options: z.array(optionZ).min(2).max(4),
    rewards: z.array(rewardRowZ).default([]),
    targetGeo: z.object({
      countries: z.array(z.string()).default([]),
      states: z.array(z.string()).default([]),
      cities: z.array(z.string()).default([]),
    }),
    resourceAssets: z.array(resourceAssetFormZ).default([]),
    expireRewardAt: z
      .string()
      .datetime()
      .optional()
      .or(z.literal("").optional())
      .optional(),
  })
  .superRefine((v, ctx) => {
    const ids = v.rewards.map((r) => r.assetId);
    const dup = ids.find((a, i) => ids.indexOf(a) !== i);
    if (dup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rewards"],
        message: `Duplicate reward assetId: ${dup}`,
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;
type OutputResourceAsset =
  | { type: "youtube"; value: string }
  | { type: "image"; value: string };

export default function PollCreatePage() {
  const navigate = useNavigate();
  const [activeRewardIndex, setActiveRewardIndex] = useState<number | null>(
    null
  );

  const defaultValues: FormValues = useMemo(
    () => ({
      title: "",
      description: "",
      options: [{ text: "" }, { text: "" }],
      rewards: [],
      targetGeo: { countries: [], states: [], cities: [] },
      resourceAssets: [],
      expireRewardAt: "",
    }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const { control, handleSubmit, watch, setValue } = form;

  // Centralized rewards field array
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "rewards",
  });

  const { mutate, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.polls.create,
    method: "POST",
    onSuccess: () => {
      appToast.success("Poll created");
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.polls.create],
      });
      navigate("/polls");
    },
  });

  const { uploadImage, loading: imageUploading } = useImageUpload();
  const isBusy = isPending || imageUploading;

  const onSubmit = async (v: FormValues) => {
    const normalizedResources: OutputResourceAsset[] = await Promise.all(
      (v.resourceAssets ?? []).map(async (a) => {
        if (a.type === "youtube") {
          return { type: "youtube", value: extractYouTubeId(a.value) };
        }
        const arr = a.value ?? [];
        let first = arr[0];
        if (first instanceof File) {
          first = await uploadImage(first);
        }
        return { type: "image", value: typeof first === "string" ? first : "" };
      })
    );

    const payload = {
      title: v.title.trim(),
      description: v.description.trim(),
      resourceAssets: normalizedResources,
      options: v.options.map((o) => ({
        text: o.text.trim(),
        archivedAt: null,
      })),
      rewards: v.rewards.map((r) => ({
        assetId: r.assetId,
        amount: r.amount,
        rewardAmountCap: r.rewardAmountCap,
        currentDistribution: 0,
        rewardType: r.rewardType,
      })),
      targetGeo: v.targetGeo,
      expireRewardAt: v.expireRewardAt?.trim() ? v.expireRewardAt : undefined,
    };

    mutate(payload as any);
  };

  return (
    <div className="p-6 space-y-8 w-full">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl tracking-wider">Create Poll</h1>
        <Button
          type="submit"
          form="poll-form"
          disabled={isBusy}
          className="text-base font-light tracking-wide"
        >
          {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Poll
        </Button>
      </div>

      <Form {...form}>
        <form
          id="poll-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-10"
        >
          <TwoPane
            isRightOpen={activeRewardIndex !== null}
            right={
              activeRewardIndex !== null && (
                <RewardDetailPanel
                  index={activeRewardIndex}
                  assetOptions={ASSET_OPTIONS as any}
                  totalLevels={TOTAL_LEVELS}
                  onClose={() => setActiveRewardIndex(null)}
                  rewards={fields}
                  append={append}
                  update={update}
                />
              )
            }
            left={
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormCard title="Basic Info">
                    <FormField
                      control={control}
                      name="title"
                      render={({ field }) => (
                        <FormInput
                          label="Poll Title"
                          placeholder="Enter poll title"
                          {...field}
                        />
                      )}
                    />
                    <FormField
                      control={control}
                      name="description"
                      render={({ field }) => (
                        <FormTextarea
                          label="Description"
                          placeholder="Write description"
                          {...field}
                        />
                      )}
                    />
                  </FormCard>

                  <FormCard title="Resource Assets" subtitle="Max.: 3">
                    <ResourceAssetsEditor
                      control={control}
                      name="resourceAssets"
                      maxAssets={3}
                    />
                  </FormCard>
                </div>

                <FormCard title="Add Options">
                  <OptionsEditor
                    control={control}
                    name="options"
                    label="Options"
                    min={2}
                    max={4}
                  />
                </FormCard>

                <FormCard title="Rewards">
                  <RewardsList
                    fields={fields}
                    assetOptions={ASSET_OPTIONS as any}
                    onEdit={setActiveRewardIndex}
                    onAdd={() => setActiveRewardIndex(-1)}
                    remove={remove}
                    allAssets={ASSET_OPTIONS.map((a) => a.value)}
                  />
                </FormCard>

                <ExpireRewardAtPicker control={control} name="expireRewardAt" />

                <TargetGeoEditor
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  basePath="targetGeo"
                />
              </div>
            }
          />
        </form>
      </Form>
    </div>
  );
}
