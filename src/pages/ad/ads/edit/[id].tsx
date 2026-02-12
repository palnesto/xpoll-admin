// src/pages/ad/ads/edit/[id].tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  Calendar,
  ExternalLink,
  Tag,
  RotateCcw,
} from "lucide-react";

import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { appToast } from "@/utils/toast";
import { cn } from "@/lib/utils";

import { useImageUpload } from "@/hooks/upload/useAssetUpload";

import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";

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

function addDaysISO(days: number) {
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return { startISO: now.toISOString(), endISO: end.toISOString() };
}

function addMonthsISO(months: number) {
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + months);
  return { startISO: now.toISOString(), endISO: end.toISOString() };
}

/* ---------------- schema ---------------- */

const editAdBaseZ = z
  .object({
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

const editAdZ = editAdBaseZ.superRefine((val, ctx) => {
  const s = val.startTime?.trim() ? val.startTime.trim() : null;
  const e = val.endTime?.trim() ? val.endTime.trim() : null;

  const hasStart = !!s;
  const hasEnd = !!e;

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
    return endpoints.entities.ad.ad.getById(
      { adId: id },
      { includeArchived: "true" },
    );
  }, [id]);

  const { data, isLoading, isFetching, isError } = useApiQuery(showUrl, {
    key: ["ad-by-id-edit", id, showUrl],
    enabled: !!id,
  } as any);

  const ad: Ad | null = (data as any)?.data?.data ?? null;
  const archived = !!ad?.archivedAt;

  // ===== labels for chips =====
  const [industryLabels, setIndustryLabels] = useState<Record<string, string>>(
    {},
  );

  // ===== original schedule (for reset-to-api) =====
  const [originalSchedule, setOriginalSchedule] = useState<{
    startTime: string | null;
    endTime: string | null;
  }>({ startTime: null, endTime: null });

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

    const firstImg = ad.uploadedImageLinks?.[0]
      ? String(ad.uploadedImageLinks[0])
      : null;

    const startLocal = isoToLocalInput(ad.startTime) ?? null;
    const endLocal = isoToLocalInput(ad.endTime) ?? null;

    reset(
      {
        title: String(ad.title ?? ""),
        description: String(ad.description ?? ""),
        hyperlink: ad.hyperlink ?? null,
        buttonText: ad.buttonText ?? null,
        startTime: startLocal,
        endTime: endLocal,
        industries: industryIds,
        uploadedImageLinks: firstImg ? [firstImg] : [],
        uploadedVideoLinks: Array.isArray(ad.uploadedVideoLinks)
          ? ad.uploadedVideoLinks
          : [],
      },
      { keepDirty: false, keepTouched: false },
    );

    setIndustryLabels(labelMap);
    setOriginalSchedule({ startTime: startLocal, endTime: endLocal });
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
    route: endpoints.entities.ad.ad.edit(id),
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

  const applyWindow = (startISO: string, endISO: string) => {
    setValue("startTime", isoToLocalInput(startISO), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("endTime", isoToLocalInput(endISO), {
      shouldDirty: true,
      shouldValidate: true,
    });
    void form.trigger(["startTime", "endTime"]);
  };

  const resetScheduleToOriginal = () => {
    setValue("startTime", originalSchedule.startTime, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("endTime", originalSchedule.endTime, {
      shouldDirty: true,
      shouldValidate: true,
    });
    void form.trigger(["startTime", "endTime"]);
  };

  const onSubmit = async (v: EditAdFormValues) => {
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
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>Failed to load ad.</AlertDescription>
        </Alert>
        <Button variant="secondary" onClick={() => navigate("/ad/ads")}>
          Back
        </Button>
      </div>
    );
  }

  const hyperlink = String(watch("hyperlink") || "").trim();
  const ctaText =
    String(watch("buttonText") || "").trim().length > 0
      ? String(watch("buttonText") || "").trim()
      : "Visit";

  return (
    <div className="p-6 space-y-6 w-full max-w-6xl mx-auto">
      {/* top header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate(`/ad/ads/${id}`)}
            className="shrink-0 rounded-2xl"
            aria-label="Back"
            title="Back"
            disabled={isBusy}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl font-semibold tracking-wide truncate">
                Edit Ad
              </h1>
              {archived ? (
                <Badge className="rounded-full bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/15">
                  Archived
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Update creative, destination and targeting
            </p>
          </div>
        </div>

        <Button
          type="submit"
          form="ad-edit-form"
          disabled={isBusy || !isValid || archived}
          className={cn("rounded-2xl", archived ? "opacity-70" : "")}
          title={archived ? "Archived ads cannot be edited" : "Save changes"}
        >
          {isBusy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      {isLoading || isFetching ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : null}

      {/* layout */}
      <Form {...form}>
        <form
          id="ad-edit-form"
          onSubmit={handleSubmitNormalized(editAdBaseZ, form, onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          noValidate
        >
          {/* LEFT: form */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="rounded-3xl overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Content
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Title and description shown to users
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <TextField<EditAdFormValues>
                  form={form}
                  schema={editAdBaseZ}
                  name="title"
                  label="Title"
                  placeholder="Enter title"
                  showError
                  showCounter
                />

                <TextAreaField<EditAdFormValues>
                  form={form}
                  schema={editAdBaseZ}
                  name="description"
                  label="Description"
                  placeholder="Write description"
                  rows={6}
                  showError
                  showCounter
                />
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Destination
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Link + CTA button label
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    placeholder="Visit"
                    showError
                    showCounter
                  />
                </div>

                {hyperlink ? (
                  <div className="rounded-2xl border bg-background/50 p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        Preview link
                      </div>
                      <div className="text-sm truncate">{hyperlink}</div>
                    </div>
                    <a
                      href={hyperlink}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0"
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-xl"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open
                      </Button>
                    </a>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Schedule
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Optional run window (start & end must be set together)
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Controller
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <label className="text-sm font-normal tracking-wide">
                          Start Date (optional)
                        </label>

                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-2xl border bg-transparent px-3 h-11",
                            errors.startTime
                              ? "border-red-500"
                              : "border-border",
                          )}
                        >
                          <Calendar className="h-4 w-4 text-muted-foreground" />
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
                            className="w-full bg-transparent outline-none text-sm"
                          />
                        </div>

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

                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-2xl border bg-transparent px-3 h-11",
                            errors.endTime ? "border-red-500" : "border-border",
                          )}
                        >
                          <Calendar className="h-4 w-4 text-muted-foreground" />
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
                            className="w-full bg-transparent outline-none text-sm"
                          />
                        </div>

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

                <Separator />

                {/* QUICK FUTURE WINDOWS */}
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Quick windows (from now)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-xl"
                      disabled={isBusy}
                      onClick={() => {
                        const { startISO, endISO } = addDaysISO(7);
                        applyWindow(startISO, endISO);
                      }}
                    >
                      Next 7 days
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-xl"
                      disabled={isBusy}
                      onClick={() => {
                        const { startISO, endISO } = addDaysISO(15);
                        applyWindow(startISO, endISO);
                      }}
                    >
                      Next 15 days
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-xl"
                      disabled={isBusy}
                      onClick={() => {
                        const { startISO, endISO } = addMonthsISO(1);
                        applyWindow(startISO, endISO);
                      }}
                    >
                      Next 1 month
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-xl"
                      disabled={isBusy}
                      onClick={() => {
                        const { startISO, endISO } = addMonthsISO(3);
                        applyWindow(startISO, endISO);
                      }}
                    >
                      Next 3 months
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={isBusy}
                      onClick={() => {
                        setValue("startTime", null, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        setValue("endTime", null, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        void form.trigger(["startTime", "endTime"]);
                      }}
                    >
                      Clear
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={isBusy}
                      onClick={resetScheduleToOriginal}
                      title="Reset schedule to the original values loaded from the server"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to original
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Targeting
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Optional industry tags (max {MAX_INDUSTRY_PER_AD})
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    Selected: {(industries ?? []).length}/{MAX_INDUSTRY_PER_AD}
                  </span>
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
                        className="px-3 py-1 rounded-full border text-xs bg-background hover:bg-accent/20 transition"
                        title="Remove industry"
                        disabled={isBusy}
                      >
                        <span className="max-w-[260px] truncate inline-block align-bottom">
                          {industryLabels[indId] || indId}
                        </span>{" "}
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
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-2 pb-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/ad/ads/${id}`)}
                disabled={isBusy}
                className="rounded-2xl"
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* RIGHT: preview */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">
              <Card className="rounded-3xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Preview
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    How your ad may look
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* image uploader */}
                  <div className="rounded-2xl border bg-background/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">Hero image</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Max 1 image
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
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
                          className="rounded-xl"
                          disabled={isBusy}
                          onClick={() => imageInputRef.current?.click()}
                        >
                          Choose
                        </Button>
                      </div>
                    </div>

                    {errors.uploadedImageLinks?.message ? (
                      <p className="text-sm text-destructive mt-2">
                        {String(errors.uploadedImageLinks.message)}
                      </p>
                    ) : null}

                    <div className="mt-3 rounded-2xl border overflow-hidden bg-background">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="preview"
                          className="w-full h-44 object-cover"
                        />
                      ) : (
                        <div className="h-44 flex items-center justify-center bg-muted/30">
                          <div className="text-center text-xs text-muted-foreground">
                            <ImageIcon className="h-5 w-5 mx-auto mb-2 opacity-70" />
                            No image selected
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground truncate">
                      {imgFirst instanceof File
                        ? imgFirst.name
                        : typeof imgFirst === "string"
                          ? "Existing image"
                          : "—"}
                    </div>
                  </div>

                  {/* mini card preview */}
                  <div className="rounded-3xl border overflow-hidden bg-background">
                    {previewUrl ? (
                      <div className="relative">
                        <img
                          src={previewUrl}
                          alt="card-preview"
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="text-white font-semibold text-sm line-clamp-1">
                            {String(watch("title") || "Title")}
                          </div>
                          <div className="text-white/80 text-xs line-clamp-2 mt-1">
                            {String(watch("description") || "Description")}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold line-clamp-1 break-words">
                          {String(watch("title") || "Title")}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-3 break-words">
                          {String(watch("description") || "Description")}
                        </div>
                      </div>

                      {/* CTA only if hyperlink exists. Default label: Visit */}
                      {hyperlink ? (
                        <Button
                          type="button"
                          className="w-full rounded-2xl"
                          onClick={() => {
                            window.open(hyperlink, "_blank", "noreferrer");
                          }}
                        >
                          <span className="truncate max-w-full inline-block">
                            {ctaText}
                          </span>
                        </Button>
                      ) : null}

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {startTime && endTime ? "Scheduled" : "No schedule"}
                        </span>
                        <span className="tabular-nums">
                          {(industries ?? []).length}/{MAX_INDUSTRY_PER_AD} tags
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {archived ? (
                <Alert className="rounded-2xl border-red-500/30 bg-red-500/10">
                  <AlertDescription className="text-red-200">
                    This ad is archived. Editing and saving is disabled.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
