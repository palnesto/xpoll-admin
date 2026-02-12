// src/pages/ad/ads/edit/[id].tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, ArrowLeft } from "lucide-react";

import { useApiQuery } from "@/hooks/useApiQuery";
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

/* ---------------- types ---------------- */

type Industry = {
  _id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
};

type Ad = {
  _id: string;
  title: string;
  description: string;
  hyperlink?: string | null;
  buttonText?: string | null;
  startTime?: string | null; // ISO from server
  endTime?: string | null; // ISO from server
  uploadedImageLinks: string[];
  uploadedVideoLinks: string[];
  industries?: Industry[];
  archivedAt?: string | null;
};

/* ---------------- helpers ---------------- */

// backend -> <input type="datetime-local" />
function isoToLocalInput(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  // datetime-local expects "YYYY-MM-DDTHH:mm" in local time
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// <input type="datetime-local" /> -> ISO string (UTC) for server
function localInputToISO(v?: string | null) {
  const s = v?.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/* ---------------- schema ---------------- */

const editAdBaseZ = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(300),
    description: z.string().trim().min(1, "Description is required").max(5000),

    hyperlink: z.string().trim().nullable().optional(),
    buttonText: z.string().trim().nullable().optional(),

    // datetime-local string OR null
    startTime: z.string().nullable().optional(),
    endTime: z.string().nullable().optional(),

    // editor state: [File|string] (max 1)
    uploadedImageLinks: z
      .array(z.any())
      .max(1, "Only 1 image allowed")
      .optional(),
    uploadedVideoLinks: z.array(z.any()).optional(),

    // store ids in form
    industries: z
      .array(z.string().trim().min(1))
      .max(MAX_INDUSTRY_PER_AD, `Max ${MAX_INDUSTRY_PER_AD} industries allowed`)
      .optional(),
  })
  .strict();

// effects schema for validation in resolver
const editAdZ = editAdBaseZ.superRefine((val, ctx) => {
  const s = val.startTime?.trim() ? val.startTime.trim() : null;
  const e = val.endTime?.trim() ? val.endTime.trim() : null;

  const hasStart = !!s;
  const hasEnd = !!e;

  // either both null OR both provided
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

  // end after start (if both)
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

export type EditAdFormValues = z.infer<typeof editAdZ>;

/* ---------------- page ---------------- */

export default function EditAdPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();

  // ===== query =====
  const showUrl = useMemo(() => {
    if (!id) return "";
    // backend supports includeArchived query param
    const base = endpoints.entities.ad.ad.getById(
      { adId: id }, // NOTE: keep until you rename endpoint arg to adId
      { includeArchived: "true" },
    );
    return base;
  }, [id]);

  const { data, isLoading, isFetching, isError } = useApiQuery(showUrl, {
    key: ["ad-by-id-edit", id, showUrl],
    enabled: !!id,
  } as any);

  const ad: Ad | null = (data as any)?.data?.data ?? null;

  // ===== labels for chips =====
  const [adOwnerLabel, setAdOwnerLabel] = useState<string>("");
  const [industryLabels, setIndustryLabels] = useState<Record<string, string>>(
    {},
  );

  // ===== form =====
  const defaultValues = useMemo<EditAdFormValues>(
    () => ({
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

  const form = useForm<EditAdFormValues>({
    resolver: zodResolver(editAdZ),
    defaultValues,
    mode: "onChange",
    criteriaMode: "firstError",
    shouldFocusError: true,
  });

  const {
    watch,
    setValue,
    getValues,
    reset,
    formState: { isSubmitting, isValid, errors },
  } = form;

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

  // ===== hydrate initial values from API =====
  useEffect(() => {
    if (!ad) return;

    const industryIds = (ad.industries ?? []).map((x) => String(x._id));
    const labelMap: Record<string, string> = {};
    (ad.industries ?? []).forEach((x) => {
      labelMap[String(x._id)] = String(x.name ?? x._id);
    });

    // IMPORTANT: image array in form is [File|string] max 1
    const firstImg = ad.uploadedImageLinks?.[0]
      ? String(ad.uploadedImageLinks[0])
      : null;

    reset(
      {
        title: String(ad.title ?? ""),
        description: String(ad.description ?? ""),
        hyperlink: ad.hyperlink ?? null,
        buttonText: ad.buttonText ?? null,
        // convert ISO -> datetime-local value
        startTime: isoToLocalInput(ad.startTime) ?? null,
        endTime: isoToLocalInput(ad.endTime) ?? null,
        industries: industryIds,
        uploadedImageLinks: firstImg ? [firstImg] : [],
        uploadedVideoLinks: Array.isArray(ad.uploadedVideoLinks)
          ? ad.uploadedVideoLinks
          : [],
      },
      { keepDirty: false, keepTouched: false },
    );

    setIndustryLabels(labelMap);

    // 1) set it onChange when user picks; OR
    // 2) if your adOwner select can accept an initial option, wire it there.
    setAdOwnerLabel(""); // unknown at load; user can re-pick to set label
  }, [ad, reset]);

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

  // ===== save =====
  const { mutateAsync, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.ad.ad.edit(id), // ✅ your endpoint
    method: "PATCH",
    onSuccess: () => {
      appToast.success("Ad updated");
      navigate(`/ad/ads/${id}`);
    },
    onError: (err: Error) => {
      console.log("error", err);
      appToast.error("Failed to update ad");
    },
  });

  const isBusy =
    isLoading || isFetching || isPending || imageUploading || isSubmitting;

  const startTime = watch("startTime");
  const endTime = watch("endTime");

  const onSubmit = async (v: EditAdFormValues) => {
    // normalize image like Poll:
    // - if it's File -> upload -> url
    // - if it's string -> keep
    let uploadedImageLinks: string[] = [];
    const first = (v.uploadedImageLinks ?? [])[0];

    if (first instanceof File) {
      const url = await uploadImage(first);
      if (url) uploadedImageLinks = [url];
    } else if (typeof first === "string" && first.trim().length > 0) {
      uploadedImageLinks = [first.trim()];
    }

    const payload = {
      title: v.title,
      description: v.description,
      hyperlink: v.hyperlink?.trim() ? v.hyperlink.trim() : null,
      buttonText: v.buttonText?.trim() ? v.buttonText.trim() : null,
      // convert datetime-local -> ISO for server
      startTime: localInputToISO(v.startTime),
      endTime: localInputToISO(v.endTime),
      industries: v.industries ?? [],
      uploadedImageLinks,
      uploadedVideoLinks: v.uploadedVideoLinks ?? [],
    };

    return mutateAsync(payload).catch(() => undefined);
  };

  if (!id) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-sm text-muted-foreground">Missing ad id.</div>
        <Button variant="secondary" onClick={() => navigate("/ad/ads")}>
          Back
        </Button>
      </div>
    );
  }

  if (isError && !isBusy) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-sm text-red-500">Failed to load ad.</div>
        <Button variant="secondary" onClick={() => navigate("/ad/ads")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate(`/ad/ads/${id}`)}
            className="shrink-0"
            aria-label="Back"
            title="Back"
            disabled={isBusy}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <h1 className="text-2xl tracking-wider truncate">Edit Ad</h1>
            <p className="text-xs text-muted-foreground truncate">
              {ad?._id ? `Ad ID: ${ad._id}` : "Loading ad…"}
            </p>
          </div>
        </div>

        <Button
          type="submit"
          form="ad-edit-form"
          disabled={isBusy || !isValid}
          className="text-base font-light tracking-wide"
        >
          {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>

      {isLoading || isFetching ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : null}

      <Form {...form}>
        <form
          id="ad-edit-form"
          onSubmit={handleSubmitNormalized(editAdBaseZ, form, onSubmit)}
          className="space-y-6"
          noValidate
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField<EditAdFormValues>
              form={form}
              schema={editAdBaseZ}
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
                  const indId = opt?.value ? String(opt.value) : "";
                  const indLabel = opt?.label ? String(opt.label) : "";
                  if (!indId) return;

                  const curr = (getValues("industries") ?? []) as string[];
                  if (curr.includes(indId)) return;

                  if (curr.length >= MAX_INDUSTRY_PER_AD) {
                    appToast.error(
                      `Max ${MAX_INDUSTRY_PER_AD} industries allowed`,
                    );
                    return;
                  }

                  form.setValue("industries", [...curr, indId], {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });

                  setIndustryLabels((prev) => ({
                    ...prev,
                    [indId]: indLabel || prev[indId] || indId,
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
                  {(industries ?? []).map((indId) => (
                    <button
                      key={indId}
                      type="button"
                      onClick={() => {
                        const curr = (getValues("industries") ??
                          []) as string[];
                        form.setValue(
                          "industries",
                          curr.filter((x) => x !== indId),
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
                      {industryLabels[indId] || indId}{" "}
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

          <TextAreaField<EditAdFormValues>
            form={form}
            schema={editAdBaseZ}
            name="description"
            label="Description"
            placeholder="Write description"
            rows={5}
            showError
            showCounter
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField<EditAdFormValues>
              form={form}
              schema={editAdBaseZ}
              name="hyperlink"
              label="Hyperlink (optional)"
              placeholder="https://..."
              showError
            />

            <TextField<EditAdFormValues>
              form={form}
              schema={editAdBaseZ}
              name="buttonText"
              label="Button Text (optional)"
              placeholder="Learn more"
              showError
              showCounter
            />
          </div>

          {/* Start / End Date (pair validation) */}
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

          {/* Image uploader (array max 1) */}
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
                        : "—"}
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
              onClick={() => navigate(`/ad/ads/${id}`)}
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
