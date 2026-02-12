// src/pages/ad/ads/create.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { useImageUpload } from "@/hooks/upload/useAssetUpload";

import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";

import AdOwnerInfiniteSelect from "@/components/commons/selects/ad/ad-owner-infinite-select";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";

/* ---------------- constants ---------------- */

export const MAX_INDUSTRY_PER_AD = 3;

/* ---------------- schema ---------------- */

const createAdBaseZ = z
  .object({
    adOwnerId: z.string().trim().min(1, "Ad owner is required"),

    title: z.string().trim().min(1, "Title is required").max(300),
    description: z.string().trim().min(1, "Description is required").max(5000),

    hyperlink: z.string().trim().nullable().optional(),
    buttonText: z.string().trim().nullable().optional(),

    startTime: z.string().nullable().optional(),
    endTime: z.string().nullable().optional(),

    uploadedImageLinks: z
      .array(z.any())
      .max(1, "Only 1 image allowed")
      .optional(),
    uploadedVideoLinks: z.array(z.any()).optional(),

    industries: z
      .array(z.string().trim().min(1))
      .max(MAX_INDUSTRY_PER_AD, `Max ${MAX_INDUSTRY_PER_AD} industries allowed`)
      .optional(),
  })
  .strict();

// effects schema for validation (resolver uses this)
const createAdZ = createAdBaseZ.superRefine((val, ctx) => {
  const s = val.startTime?.trim() ? val.startTime.trim() : null;
  const e = val.endTime?.trim() ? val.endTime.trim() : null;

  const hasStart = !!s;
  const hasEnd = !!e;

  // either BOTH null or BOTH present
  if (hasStart !== hasEnd) {
    if (!hasStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Start date is required when end date is provided",
      });
    }
    if (!hasEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End date is required when start date is provided",
      });
    }
  }

  // end after start (only if both present)
  if (hasStart && hasEnd) {
    const st = new Date(s!).getTime();
    const et = new Date(e!).getTime();
    if (!Number.isNaN(st) && !Number.isNaN(et) && et < st) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
  }

  if (val.hyperlink?.trim()) {
    const link = val.hyperlink.trim();
    const looksValid =
      /^https?:\/\/.+/i.test(link) ||
      /^www\./i.test(link) ||
      /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(link);

    if (!looksValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hyperlink"],
        message: "Enter a valid link",
      });
    }
  }
});

export type CreateAdFormValues = z.infer<typeof createAdZ>;

/* ---------------- page ---------------- */

export default function CreateAdPage() {
  const navigate = useNavigate();

  const defaultValues = useMemo<CreateAdFormValues>(
    () => ({
      adOwnerId: "",
      title: "",
      description: "",
      hyperlink: null,
      buttonText: null,
      startTime: null,
      endTime: null,
      industries: [],
      uploadedImageLinks: [],
      uploadedVideoLinks: [],
    }),
    [],
  );

  const form = useForm<CreateAdFormValues>({
    resolver: zodResolver(createAdZ), // ✅ effects schema for validation
    defaultValues,
    mode: "onChange",
    criteriaMode: "firstError",
    shouldFocusError: true,
  });

  const {
    watch,
    setValue,
    getValues,
    formState: { isSubmitting, isValid, errors },
  } = form;

  // ===== labels for chips =====
  const [adOwnerLabel, setAdOwnerLabel] = useState<string>("");
  const [industryLabels, setIndustryLabels] = useState<Record<string, string>>(
    {},
  );

  // clamp industries to max
  const industries = watch("industries") ?? [];
  useEffect(() => {
    if (Array.isArray(industries) && industries.length > MAX_INDUSTRY_PER_AD) {
      setValue("industries", industries.slice(0, MAX_INDUSTRY_PER_AD), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [industries, setValue]);

  // ===== image preview =====
  const { uploadImage, loading: imageUploading } = useImageUpload();
  const imgArr = watch("uploadedImageLinks") as any[] | undefined;
  const imgFirst = imgArr?.[0];

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!imgFirst) {
      setPreviewUrl(null);
      return;
    }
    if (typeof imgFirst === "string") {
      setPreviewUrl(imgFirst);
      return;
    }
    if (imgFirst instanceof File) {
      const url = URL.createObjectURL(imgFirst);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [imgFirst]);

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // ===== api =====

  const { mutateAsync, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.ad.ad.create,
    method: "POST",
    onSuccess: () => {
      appToast.success("Ad created");
      navigate("/ad/ads");
    },
    onError: (err: Error) => {
      console.log("error", err);
      appToast.error("Failed to create ad");
    },
  });

  const isBusy = isPending || imageUploading || isSubmitting;

  const onSubmit = async (v: CreateAdFormValues) => {
    let uploadedImageLinks: string[] = [];
    const first = (v.uploadedImageLinks ?? [])[0];

    if (first instanceof File) {
      const url = await uploadImage(first);
      if (url) uploadedImageLinks = [url];
    } else if (typeof first === "string" && first.trim().length > 0) {
      uploadedImageLinks = [first.trim()];
    }

    const payload = {
      adOwnerId: v.adOwnerId,
      title: v.title,
      description: v.description,
      hyperlink: v.hyperlink?.trim() ? v.hyperlink.trim() : null,
      buttonText: v.buttonText?.trim() ? v.buttonText.trim() : null,
      startTime: v.startTime?.trim() ? v.startTime.trim() : null,
      endTime: v.endTime?.trim() ? v.endTime.trim() : null,
      industries: v.industries ?? [],
      uploadedImageLinks,
      uploadedVideoLinks: v.uploadedVideoLinks ?? [],
    };

    return mutateAsync(payload).catch(() => undefined);
  };

  const selectedOwnerId = watch("adOwnerId");
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  return (
    <div className="p-6 space-y-8 w-full">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl tracking-wider">Create Ad</h1>

        <Button
          type="submit"
          form="ad-create-form"
          disabled={isBusy || !isValid}
          className="text-base font-light tracking-wide"
        >
          {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Ad
        </Button>
      </div>

      <Form {...form}>
        <form
          id="ad-create-form"
          // ✅ IMPORTANT: pass the ZodObject schema (NOT the effects schema)
          onSubmit={handleSubmitNormalized(createAdBaseZ, form, onSubmit)}
          className="space-y-6"
          noValidate
        >
          {/* Ad owner */}
          <div className="space-y-2">
            <AdOwnerInfiniteSelect
              control={(form as any).control}
              name="adOwnerId"
              label="Ad Owner"
              onChange={(opt: any) => {
                const id = opt?.value ? String(opt.value) : "";
                const label = opt?.label ? String(opt.label) : "";

                if (!id) {
                  form.setValue("adOwnerId", "", {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                  setAdOwnerLabel("");
                  return;
                }

                form.setValue("adOwnerId", id, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
                setAdOwnerLabel(label || "");
              }}
            />

            {selectedOwnerId ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    form.setValue("adOwnerId", "", {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                    setAdOwnerLabel("");
                  }}
                  className="px-3 py-1 rounded-full border text-xs hover:bg-muted"
                  title="Remove ad owner"
                >
                  {adOwnerLabel || selectedOwnerId}{" "}
                  <span className="ml-1 opacity-70">×</span>
                </button>
              </div>
            ) : null}

            {errors.adOwnerId?.message ? (
              <p className="text-sm text-destructive">
                {String(errors.adOwnerId.message)}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField<CreateAdFormValues>
              form={form}
              schema={createAdBaseZ}
              name="title"
              label="Title"
              placeholder="Enter title"
              showError
              showCounter
            />

            {/* Industries */}
            <div className="space-y-2">
              <label className="text-sm font-normal tracking-wide">
                Industries (optional) • max {MAX_INDUSTRY_PER_AD}
              </label>

              <IndustryInfiniteSelect
                placeholder="Search industries..."
                onChange={(opt) => {
                  const id = opt?.value ? String(opt.value) : "";
                  const label = opt?.label ? String(opt.label) : "";
                  if (!id) return;

                  const curr = (getValues("industries") ?? []) as string[];
                  if (curr.includes(id)) return;

                  if (curr.length >= MAX_INDUSTRY_PER_AD) {
                    appToast.error(
                      `Max ${MAX_INDUSTRY_PER_AD} industries allowed`,
                    );
                    return;
                  }

                  form.setValue("industries", [...curr, id], {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });

                  setIndustryLabels((prev) => ({
                    ...prev,
                    [id]: label || prev[id] || id,
                  }));
                }}
                selectProps={{
                  menuPortalTarget: document.body,
                  menuPosition: "fixed",
                  value: null as any,
                  isClearable: true,
                }}
              />

              <div className="text-xs text-muted-foreground">
                Selected: {(industries ?? []).length}/{MAX_INDUSTRY_PER_AD}
              </div>

              {(industries ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(industries ?? []).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        const curr = (getValues("industries") ??
                          []) as string[];
                        form.setValue(
                          "industries",
                          curr.filter((x) => x !== id),
                          {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          },
                        );
                      }}
                      className="px-3 py-1 rounded-full border text-xs hover:bg-muted"
                      title="Remove industry"
                    >
                      {industryLabels[id] || id}{" "}
                      <span className="ml-1 opacity-70">×</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {errors.industries?.message ? (
                <p className="text-sm text-destructive">
                  {String(errors.industries.message)}
                </p>
              ) : null}
            </div>
          </div>

          <TextAreaField<CreateAdFormValues>
            form={form}
            schema={createAdBaseZ}
            name="description"
            label="Description"
            placeholder="Write description"
            rows={5}
            showError
            showCounter
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField<CreateAdFormValues>
              form={form}
              schema={createAdBaseZ}
              name="hyperlink"
              label="Hyperlink (optional)"
              placeholder="https://..."
              showError
            />

            <TextField<CreateAdFormValues>
              form={form}
              schema={createAdBaseZ}
              name="buttonText"
              label="Button Text (optional)"
              placeholder="Learn more"
              showError
              showCounter
            />
          </div>

          {/* Start / End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <div className="space-y-2">
                  <label className="text-sm font-normal tracking-wide">
                    Start Date (optional)
                  </label>

                  <input
                    type="datetime-local"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v ? v : null);
                      void form.trigger(["startTime", "endTime"]);
                    }}
                    onBlur={() => {
                      field.onBlur();
                      void form.trigger(["startTime", "endTime"]);
                    }}
                    className={[
                      "w-full h-11 rounded-2xl border px-3 text-base font-light tracking-wide bg-transparent outline-none focus:ring-2",
                      errors.startTime
                        ? "border-red-500 focus:ring-red-200"
                        : "border-border focus:ring-muted",
                    ].join(" ")}
                  />

                  {errors.startTime?.message ? (
                    <p className="text-sm text-destructive">
                      {String(errors.startTime.message)}
                    </p>
                  ) : null}

                  {!errors.startTime && !!startTime && !endTime ? (
                    <p className="text-xs text-muted-foreground">
                      Pick an end date to complete the range.
                    </p>
                  ) : null}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <div className="space-y-2">
                  <label className="text-sm font-normal tracking-wide">
                    End Date (optional)
                  </label>

                  <input
                    type="datetime-local"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v ? v : null);
                      void form.trigger(["startTime", "endTime"]);
                    }}
                    onBlur={() => {
                      field.onBlur();
                      void form.trigger(["startTime", "endTime"]);
                    }}
                    className={[
                      "w-full h-11 rounded-2xl border px-3 text-base font-light tracking-wide bg-transparent outline-none focus:ring-2",
                      errors.endTime
                        ? "border-red-500 focus:ring-red-200"
                        : "border-border focus:ring-muted",
                    ].join(" ")}
                  />

                  {errors.endTime?.message ? (
                    <p className="text-sm text-destructive">
                      {String(errors.endTime.message)}
                    </p>
                  ) : null}

                  {!errors.endTime && !!endTime && !startTime ? (
                    <p className="text-xs text-muted-foreground">
                      Pick a start date to complete the range.
                    </p>
                  ) : null}
                </div>
              )}
            />
          </div>

          {/* Image uploader */}
          <div className="space-y-3 rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium tracking-wide">
                  Image (optional)
                </div>
                <div className="text-xs text-muted-foreground">Max 1 image</div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setValue("uploadedImageLinks", [], {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  disabled={isBusy || !(imgArr?.length ?? 0)}
                >
                  Remove
                </Button>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setValue("uploadedImageLinks", [f] as any, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                    e.currentTarget.value = "";
                  }}
                />

                <Button
                  type="button"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => imageInputRef.current?.click()}
                >
                  Choose file
                </Button>
              </div>
            </div>

            {errors.uploadedImageLinks?.message ? (
              <p className="text-sm text-destructive">
                {String(errors.uploadedImageLinks.message)}
              </p>
            ) : null}

            {previewUrl ? (
              <div className="flex items-start gap-4">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="h-28 w-28 rounded-xl object-cover border"
                />
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Selected</div>
                  <div className="text-sm break-all">
                    {imgFirst instanceof File
                      ? imgFirst.name
                      : typeof imgFirst === "string"
                        ? imgFirst
                        : "-"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No image selected.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isBusy}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
