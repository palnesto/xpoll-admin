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
import dayjs from "dayjs";
import {
  __SYSYEM_STANDARAD_DATE_FORMAT__,
  localAdminISOtoUTC,
} from "@/utils/time";
import {
  ASSET_OPTIONS,
  descriptionZod,
  expireRewardAtZod,
  optionsZod,
  RESOURCE_TYPES_STRING,
  pollResourceAssetFormZ,
  rewardsZod,
  targetGeoZod,
  titleZod,
  _MAX_RESOURCE_ASSETS_COUNT_,
  OutputResourceAsset,
} from "@/validators/poll-trial-form";
import { assetSpecs } from "@/utils/currency-assets/asset";

const formSchema = z.object({
  title: titleZod,
  description: descriptionZod,
  options: optionsZod,
  rewards: rewardsZod,
  targetGeo: targetGeoZod,
  resourceAssets: pollResourceAssetFormZ,
  expireRewardAt: expireRewardAtZod,
});
type FormValues = z.infer<typeof formSchema>;

export default function PollCreatePage() {
  const navigate = useNavigate();
  const [activeRewardIndex, setActiveRewardIndex] = useState<number | null>(
    null,
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
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const { control, handleSubmit, watch, setValue } = form;
  const { errors, isSubmitting } = form.formState;

  // Rewards array
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
      navigate("/analytics/polls");
    },
    onError: (err: Error) => {
      console.log("error", err);
    },
  });

  const { uploadImage, loading: imageUploading } = useImageUpload();
  const isBusy = isPending || imageUploading || isSubmitting;

  const onSubmit = async (v: FormValues) => {
    const normalizedResources: OutputResourceAsset[] = (
      await Promise.all(
        (v.resourceAssets ?? []).map(async (a) => {
          try {
            if (a.type === RESOURCE_TYPES_STRING.YOUTUBE) {
              const id = extractYouTubeId(a.value);
              if (!id) return null;
              return { type: RESOURCE_TYPES_STRING.YOUTUBE, value: id };
            }
            const arr = a.value ?? [];
            const first: File | string | undefined = arr[0];
            if (first instanceof File) {
              const url = await uploadImage(first);
              return url
                ? { type: RESOURCE_TYPES_STRING.IMAGE, value: url }
                : null;
            }
            if (typeof first === "string" && first.trim().length > 0) {
              return { type: RESOURCE_TYPES_STRING.IMAGE, value: first };
            }
            return null;
          } catch (e) {
            console.log(e);
            return null;
          }
        }),
      )
    ).filter(Boolean) as OutputResourceAsset[];

    const expireRewardAtUTC = v.expireRewardAt?.trim()
      ? localAdminISOtoUTC(
          dayjs(v.expireRewardAt?.trim()).format(
            __SYSYEM_STANDARAD_DATE_FORMAT__,
          ),
        )
      : undefined;

    const payload = {
      title: v.title,
      description: v.description,
      resourceAssets: normalizedResources,
      options: v.options.map((o) => ({
        text: o.text,
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
      expireRewardAt: expireRewardAtUTC,
    };

    const clientSideIssues: string[] = [];
    if (payload.options.some((o) => o.text.length < 3)) {
      clientSideIssues.push("Each option must be at least 3 characters.");
    }
    if (payload.resourceAssets.some((ra) => ra.type === "image" && !ra.value)) {
      clientSideIssues.push("Found an empty image asset.");
    }
    if (payload.rewards.length) {
      const ids = payload.rewards.map((r) => r.assetId);
      const dup = ids.find((a, i) => ids.indexOf(a) !== i);
      if (dup) clientSideIssues.push(`Duplicate reward asset: ${dup}`);
    }
    try {
      mutate(payload);
    } catch (err) {
      console.log("error", err);
      appToast.error("Something went wrong before the request was sent.");
    }
  };

  return (
    <div className="p-6 space-y-8 w-full">
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
                          onBlur={() => {
                            field.onBlur();
                          }}
                        />
                      )}
                    />
                  </FormCard>
                  <FormCard
                    title="Resource Assets (Optional)"
                    subtitle="Max.: 3"
                  >
                    <ResourceAssetsEditor
                      control={control}
                      name="resourceAssets"
                      maxAssets={_MAX_RESOURCE_ASSETS_COUNT_}
                      isEditing={true}
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
                  {errors.rewards?.message && (
                    <p className="text-sm text-destructive">
                      {errors.rewards?.message}
                    </p>
                  )}
                </FormCard>
                <ExpireRewardAtPicker control={control} name="expireRewardAt" />
                <TargetGeoEditor
                  control={control}
                  label="Target Geo (Optional)"
                  watch={watch}
                  setValue={setValue}
                  basePath="targetGeo"
                  selectProps={{
                    menuPlacement: "top",
                  }}
                />
              </div>
            }
          />
        </form>
      </Form>
    </div>
  );
}
