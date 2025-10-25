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
import { Loader2 } from "lucide-react";
import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
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
import {
  _MAX_RESOURCE_ASSETS_COUNT_,
  ASSET_OPTIONS,
  descriptionZod,
  expireRewardAtZod,
  optionsZod,
  OutputResourceAsset,
  pollResourceAssetFormZ,
  RESOURCE_TYPES_STRING,
  ResourceType,
  rewardsZod,
  targetGeoZod,
  titleZod,
  trialResourceAssetFormZ,
} from "@/validators/poll-trial-form";
import { assetSpecs } from "@/utils/currency-assets/asset";
import {
  __SYSYEM_STANDARAD_DATE_FORMAT__,
  localAdminISOtoUTC,
} from "@/utils/time";
import dayjs from "dayjs";

const trialFormZ = z
  .object({
    title: titleZod,
    description: descriptionZod,
    rewards: rewardsZod,
    expireRewardAt: expireRewardAtZod,
    targetGeo: targetGeoZod,
    resourceAssets: trialResourceAssetFormZ,
  })
  .strict();

const subPollZ = z
  .object({
    title: titleZod,
    description: descriptionZod,
    resourceAssets: pollResourceAssetFormZ,
    options: optionsZod,
  })
  .strict();

const formSchema = z.object({
  trial: trialFormZ,
  polls: z.array(subPollZ).min(1),
});

type FormValues = z.infer<typeof formSchema>;

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
        expireRewardAt: null,
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

  console.log({
    watch: form.watch(),
    errors: form.formState.errors,
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
      navigate("/analytics/trials");
    },
  });

  const { uploadImage, loading: imageUploading } = useImageUpload();
  const isBusy = isPending || imageUploading;

  const normalizeAssets = async (
    arr?: { type: ResourceType; value: any }[]
  ): Promise<OutputResourceAsset[]> => {
    const items = arr ?? [];
    return Promise.all(
      items.map(async (a) => {
        if (a.type === RESOURCE_TYPES_STRING.YOUTUBE)
          return {
            type: RESOURCE_TYPES_STRING.YOUTUBE,
            value: extractYouTubeId(String(a.value)),
          };
        const list = (a.value ?? []) as (File | string)[];
        let first = list[0];
        if (first instanceof File) first = await uploadImage(first);
        return {
          type: RESOURCE_TYPES_STRING.IMAGE,
          value: typeof first === "string" ? first : "",
        };
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
          ? localAdminISOtoUTC(
              dayjs(v.trial.expireRewardAt?.trim()).format(
                __SYSYEM_STANDARAD_DATE_FORMAT__
              )
            )
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
          <h1 className="text-2xl tracking-wider">Create Trail</h1>
          <Button
            type="submit"
            form="trial-form"
            disabled={isBusy}
            className="text-base font-light tracking-wide"
          >
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Trail
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
                  assetOptions={ASSET_OPTIONS}
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
                          label="Trail Title"
                          placeholder="Enter trail title"
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
                      mediaAllowed={[RESOURCE_TYPES_STRING.IMAGE]}
                      maxAssets={_MAX_RESOURCE_ASSETS_COUNT_}
                      isEditing={true}
                    />
                    {form.formState.errors.trial?.resourceAssets && (
                      <p className="mt-2 text-sm text-destructive">
                        {(form.formState.errors.trial.resourceAssets as any)
                          .message ?? "Add at least 1 media"}
                      </p>
                    )}
                  </FormCard>
                </div>

                <FormCard title="Rewards">
                  <div className="flex gap-2 items-center justify-end">
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => setActiveRewardIndex(-1)}
                      className="w-fit p-2"
                      disabled={
                        fields?.length >= Object.keys(assetSpecs)?.length
                      }
                    >
                      Add reward
                    </Button>
                  </div>
                  {fields.length > 0 && (
                    <RewardsList
                      fields={fields}
                      assetOptions={ASSET_OPTIONS}
                      onEdit={setActiveRewardIndex}
                      onAdd={() => setActiveRewardIndex(-1)}
                      remove={remove}
                      allAssets={ASSET_OPTIONS.map((a) => a.value)}
                    />
                  )}
                  {form?.formState?.errors.rewards?.message && (
                    <p className="text-sm text-destructive">
                      {form?.formState?.errors.rewards?.message}
                    </p>
                  )}
                </FormCard>

                {/* Expiry */}
                <ExpireRewardAtPicker
                  control={control}
                  name="trial.expireRewardAt"
                />

                {/* Target Geo */}
                <TargetGeoEditor
                  control={control}
                  label="Target Geo (Optional)"
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
