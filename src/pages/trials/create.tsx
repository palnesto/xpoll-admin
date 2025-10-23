import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { endpoints } from "@/api/endpoints";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
import { type AssetOption } from "@/components/polling/editors/RewardsEditor";
import TargetGeoEditor from "@/components/polling/editors/TargetGeoEditor";
import ExpireRewardAtPicker from "@/components/polling/editors/ExpireRewardAtPicker";
import SubPollEditor from "@/components/polling/cards/SubPollEditor";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import { extractYouTubeId } from "@/utils/youtube";
import { Form, FormField } from "@/components/ui/form";
import { FormCard } from "@/components/form/form-card";
import TwoPane from "@/layouts/TwoPane";
import { FormInput } from "@/components/form/input";
import { FormTextarea } from "@/components/form/textarea";
import RewardsList from "@/components/polling/editors/RewardsList";
import RewardDetailPanel from "@/components/polling/editors/RewardDetailPanel";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { optionZ } from "../polls/create";

const ASSET_OPTIONS: AssetOption[] = (
  [
    { value: "xOcta" },
    { value: "xMYST" },
    { value: "xDrop" },
    { value: "xPoll" },
  ] as const
).map((a) => ({
  value: a.value,
  label: assetSpecs[a.value as AssetType].parentSymbol,
}));

const TOTAL_LEVELS = 10 as const;

const resourceAssetZ = z.union([
  z.object({ type: z.literal("youtube"), value: z.string().min(11) }),
  z.object({
    type: z.literal("image"),
    value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
  }),
]);
const rewardRowZ = z
  .object({
    assetId: z.enum(["xOcta", "xMYST", "xDrop", "xPoll"]),
    amount: z.coerce.number().int().min(1),
    rewardAmountCap: z.coerce.number().int().min(1),
    rewardType: z.enum(["max", "min"]).default("max"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    message: "rewardAmountCap must be >= amount",
    path: ["rewardAmountCap"],
  });

const trialFormZ = z
  .object({
    title: z.string().min(3).trim(),
    description: z.string().min(3).trim(),
    rewards: z.array(rewardRowZ).optional(),
    expireRewardAt: z
      .string()
      .datetime()
      .optional()
      .or(z.literal("").optional())
      .optional(),
    targetGeo: z
      .object({
        countries: z.array(z.string()).default([]),
        states: z.array(z.string()).default([]),
        cities: z.array(z.string()).default([]),
      })
      .optional(),
    resourceAssets: z.array(resourceAssetZ).default([]),
  })
  .strict();

const subPollZ = z
  .object({
    title: z.string().min(3).trim(),
    description: z.string().min(3).trim(),
    resourceAssets: z.array(resourceAssetZ).default([]),
    options: z.array(optionZ).min(2).max(4),
  })
  .strict();

const formSchema = z
  .object({
    trial: trialFormZ,
    polls: z.array(subPollZ).min(1),
  })
  .superRefine((val, ctx) => {
    const ids = (val.trial.rewards ?? []).map((r) => r.assetId);
    const dup = ids.find((a, i) => ids.indexOf(a) !== i);
    if (dup)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trial", "rewards"],
        message: `Duplicate reward assetId: ${dup}`,
      });
  });

type FormValues = z.infer<typeof formSchema>;
type OutputResourceAsset =
  | { type: "youtube"; value: string }
  | { type: "image"; value: string };

/* =========================================================
   Component
   ========================================================= */
export default function TrialCreatePage() {
  const navigate = useNavigate();
  const [activeRewardIndex, setActiveRewardIndex] = useState<number | null>(
    null
  );
  const defaultValues: FormValues = useMemo(
    () => ({
      trial: {
        title: "",
        description: "",
        resourceAssets: [],
        rewards: [],
        targetGeo: { countries: [], states: [], cities: [] },
        expireRewardAt: "",
      },
      polls: [
        {
          title: "",
          description: "",
          resourceAssets: [],
          options: [{ text: "" }, { text: "" }],
        },
      ],
    }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const { control, handleSubmit, watch, setValue } = form;
  const pollsArray = useFieldArray({ control, name: "polls" });
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "trial.rewards",
  });
  const { mutate, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.trials.create,
    method: "POST",
    onSuccess: () => {
      appToast.success("Trial created");
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.trials.all],
      });
      navigate("/trials");
    },
  });

  const { uploadImage, loading: imageUploading } = useImageUpload();
  const isBusy = isPending || imageUploading;

  const normalizeAssets = async (
    arr?: { type: "image" | "youtube"; value: any }[]
  ): Promise<OutputResourceAsset[]> => {
    const items = arr ?? [];
    return Promise.all(
      items.map(async (a) => {
        if (a.type === "youtube")
          return { type: "youtube", value: extractYouTubeId(String(a.value)) };
        const list = (a.value ?? []) as (File | string)[];
        let first = list[0];
        if (first instanceof File) first = await uploadImage(first);
        return { type: "image", value: typeof first === "string" ? first : "" };
      })
    );
  };

  const onSubmit = async (v: FormValues) => {
    const payload = {
      trial: {
        title: v.trial.title,
        description: v.trial.description,
        resourceAssets: await normalizeAssets(v.trial.resourceAssets),
        ...(Array.isArray(v.trial.rewards) && v.trial.rewards.length > 0
          ? {
              rewards: v.trial.rewards.map((r) => ({
                assetId: r.assetId,
                amount: r.amount,
                rewardAmountCap: r.rewardAmountCap,
                rewardType: r.rewardType,
              })),
            }
          : {}),
        targetGeo: v.trial.targetGeo,
        expireRewardAt: v.trial.expireRewardAt?.trim()
          ? v.trial.expireRewardAt
          : undefined,
      },
      polls: await Promise.all(
        v.polls.map(async (p) => ({
          title: p.title,
          description: p.description,
          resourceAssets: await normalizeAssets(p.resourceAssets),
          options: p.options.map((o) => ({ text: o.text.trim() })),
        }))
      ),
    };

    console.log("payload", payload);
    mutate(payload as any);
  };

  return (
    <Form {...form}>
      <div className="p-6 space-y-8 w-full">
        {/* Header (matches Create Poll) */}
        <div className="flex justify-between items-center w-full">
          <h1 className="text-2xl tracking-wider">Create Trial</h1>
          <Button
            type="submit"
            form="trial-form"
            disabled={isBusy}
            className="text-base font-light tracking-wide"
          >
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Trial
          </Button>
        </div>

        {/* Body (matches Create Poll structure) */}
        <form
          id="trial-form"
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
                {/* Grid: Basic Info + Assets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormCard title="Basic Info">
                    <FormField
                      control={control}
                      name="trial.title"
                      render={({ field }) => (
                        <FormInput
                          label="Trial Title"
                          placeholder="Enter trial title"
                          {...field}
                        />
                      )}
                    />
                    <FormField
                      control={control}
                      name="trial.description"
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
                      name="trial.resourceAssets"
                      label="Media (Images / YouTube)"
                      isEditing={true}
                    />
                  </FormCard>
                </div>

                <FormCard title="Rewards">
                  <div className="flex gap-2 items-center">
                    <Button
                      size="icon"
                      onClick={() => setActiveRewardIndex(-1)}
                      className="w-fit p-2"
                    >
                      Add reward
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => fields.length && remove(0)}
                      disabled={!fields.length}
                      className="cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Trash2 className="text-red-600" />
                    </Button>
                  </div>
                  {fields.length > 0 ? (
                    <RewardsList
                      fields={fields}
                      assetOptions={ASSET_OPTIONS as any}
                      onEdit={setActiveRewardIndex}
                      onAdd={() => setActiveRewardIndex(-1)}
                      remove={remove}
                      allAssets={ASSET_OPTIONS.map((a) => a.value)}
                    />
                  ) : (
                    <></>
                  )}
                </FormCard>
                {/* <FormCard title="Rewards">
                  <RewardsEditor
                    control={control}
                    name="trial.rewards"
                    assetOptions={ASSET_OPTIONS}
                    includeRewardType
                    showCurvePreview
                    totalLevelsForPreview={TOTAL_LEVELS}
                    label="Rewards"
                  />
                </FormCard> */}

                {/* Expiry */}
                <ExpireRewardAtPicker
                  control={control}
                  name="trial.expireRewardAt"
                />

                {/* Target Geo */}
                <TargetGeoEditor
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  basePath="trial.targetGeo"
                />

                <section className="border rounded-lg p-4 space-y-6">
                  <div className="flex justify-between items-center w-full">
                    <h1 className="text-2xl tracking-wider">Polls</h1>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        pollsArray.append({
                          title: "",
                          description: "",
                          resourceAssets: [],
                          options: [{ text: "" }, { text: "" }],
                        })
                      }
                    >
                      + Add Poll
                    </Button>
                  </div>
                  <div className="space-y-8">
                    {pollsArray.fields.map((pf, pIdx) => (
                      <SubPollEditor
                        key={pf.id}
                        control={control}
                        index={pIdx}
                        onRemove={() => pollsArray.remove(pIdx)}
                        disableRemove={pollsArray.fields.length <= 1}
                        title={`Poll ${pIdx + 1}`}
                      />
                    ))}
                  </div>
                </section>
              </div>
            }
          />
        </form>
      </div>
    </Form>
  );
}
