import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { Loader2, Trash2 } from "lucide-react";
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
import { assetSpecs } from "@/utils/asset";

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log("[PollCreate]", ...args);
const group = (label: string) => DEBUG && console.group(label);
const groupEnd = () => DEBUG && console.groupEnd();

const TOTAL_LEVELS = 10 as const;
const ASSET_OPTIONS = [
  { label: "OCTA", value: "xOcta" },
  { label: "MYST", value: "xMYST" },
  { label: "DROP", value: "xDrop" },
  { label: "XPOLL", value: "xPoll" },
] as const;

export const optionTextZod = z
  .string()
  .min(1, {
    message: "Option must be at least 1 character(s)",
  })
  .max(500)
  .trim();

export const optionZ = z.object({
  text: optionTextZod,
});
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
  z.object({ type: z.literal("youtube"), value: z.string().min(1) }),
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
    rewards: z.array(rewardRowZ).min(1, "At least one reward is required"),
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
      .refine(
        (val) => {
          if (!val || val === "") return true; // allow empty / optional
          const d = new Date(val);
          const now = new Date();
          return d >= now;
        },
        {
          message: "Expiry date must not be in the past",
        }
      ),
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

  const { control, handleSubmit, watch, setValue, formState } = form;
  const { errors, isValid, isSubmitting } = form.formState;

  console.log({
    watch,
    errors,
  });

  // Rewards array
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "rewards",
  });

  console.log({
    error: formState.errors,
    watch: watch(),
  });

  // API mutation with error logging
  const { mutate, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.polls.create,
    method: "POST",
    onSuccess: (data: any) => {
      group("✅ API Success");
      log("response:", data);
      groupEnd();
      appToast.success("Poll created");
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.polls.create],
      });
      navigate("/analytics/polls");
    },
    onError: (err: any) => {
      group("❌ API Error");
      log("error object:", err);
      // Try to show helpful message if present
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to create poll";
      log("error message:", msg);
      groupEnd();
      // appToast.error(msg);
    },
  });

  const { uploadImage, loading: imageUploading } = useImageUpload();
  const isBusy = isPending || imageUploading || isSubmitting;

  // Helper: compute a readable first error (for invalid submits)
  function firstErrorMessage(e: FieldErrors<FormValues>): string {
    // pick the first leaf error
    const scan = (obj: any): string | null => {
      for (const k in obj) {
        const v = obj[k];
        if (!v) continue;
        if (v?.message) return v.message as string;
        if (typeof v === "object") {
          const child = scan(v);
          if (child) return child;
        }
      }
      return null;
    };
    return scan(e) || "Please check the form fields.";
  }

  const onInvalid = (e: FieldErrors<FormValues>) => {
    group("⛔ Invalid Submit (Zod)");
    log("errors:", e);
    log("isValid:", isValid);
    groupEnd();
    // appToast.error(firstErrorMessage(e));
  };

  const onSubmit = async (v: FormValues) => {
    group("🚀 onSubmit");
    log("raw values:", v);

    // Normalize resource assets, but avoid sending empties.
    const normalizedResources: OutputResourceAsset[] = (
      await Promise.all(
        (v.resourceAssets ?? []).map(async (a, idx) => {
          try {
            if (a.type === "youtube") {
              const id = extractYouTubeId(a.value);
              log(`resource[${idx}] youtube ->`, { input: a.value, id });
              // If we fail to extract a valid id, skip this asset
              if (!id) return null;
              return { type: "youtube", value: id };
            }
            const arr = a.value ?? [];
            const first: File | string | undefined = arr[0];
            if (first instanceof File) {
              log(`resource[${idx}] image uploading…`, first);
              const url = await uploadImage(first);
              log(`resource[${idx}] image uploaded`, url);
              return url ? { type: "image", value: url } : null;
            }
            if (typeof first === "string" && first.trim().length > 0) {
              log(`resource[${idx}] image (existing url)`, first);
              return { type: "image", value: first };
            }
            log(`resource[${idx}] image skipped (empty)`);
            return null;
          } catch (e) {
            log(`resource[${idx}] error:`, e);
            return null;
          }
        })
      )
    ).filter(Boolean) as OutputResourceAsset[];

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

    // Some quick sanity checks before hitting the API
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

    window._lastPollPayload = payload; // quick access in DevTools
    group("📦 Payload");
    log("payload:", payload);
    if (clientSideIssues.length) {
      log("client-side warnings:", clientSideIssues);
    }
    groupEnd();

    try {
      console.log("payload", payload);
      mutate(payload as any);
    } catch (e) {
      group("❌ mutate threw (synchronous)");
      log(e);
      groupEnd();
      appToast.error("Something went wrong before the request was sent.");
    }
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
          onSubmit={handleSubmit(onSubmit, onInvalid)}
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
                          // onBlur={(e) => {
                          //   field.onBlur();
                          //   log("title blur:", e.target.value);
                          // }}
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
                          onBlur={(e) => {
                            field.onBlur();
                            log("description blur:", e.target.value);
                          }}
                        />
                      )}
                    />
                  </FormCard>

                  <FormCard title="Resource Assets" subtitle="Max.: 3">
                    <ResourceAssetsEditor
                      control={control}
                      name="resourceAssets"
                      maxAssets={3}
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
                  <div className="flex gap-2 items-center">
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

                  {errors.rewards?.message && (
                    <p className="text-sm text-destructive">
                      {errors.rewards?.message}
                    </p>
                  )}
                </FormCard>
                <ExpireRewardAtPicker control={control} name="expireRewardAt" />
                <TargetGeoEditor
                  control={control}
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
