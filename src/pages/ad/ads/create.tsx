// src/pages/ad/ads/create.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

import {
  Loader2,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  Calendar,
  ExternalLink,
  Tag,
} from "lucide-react";

import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { appToast } from "@/utils/toast";

import {
  adminZone,
  utcToAdminFormatted,
  utcToAdmin,
  localAdminISOtoUTC,
} from "@/utils/time";

import { useImageUpload } from "@/hooks/upload/useAssetUpload";

import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";

import AdOwnerInfiniteSelect from "@/components/commons/selects/ad/ad-owner-infinite-select";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";
import { useApiQuery } from "@/hooks/useApiQuery";

/* ---------------- constants ---------------- */

export const MAX_INDUSTRY_PER_AD = 3;

/* ---------------- helpers ---------------- */

function normalizeDatetimeLocal(v: string) {
  // input type="datetime-local" => "YYYY-MM-DDTHH:mm"
  // utils expects "YYYY-MM-DD HH:mm"
  return v.includes("T") ? v.replace("T", " ") : v;
}

// <input type="datetime-local" /> (viewer/admin local) -> backend UTC ISO
function localInputToISO(v?: string | null) {
  const s = v?.trim();
  if (!s) return null;
  try {
    return localAdminISOtoUTC(normalizeDatetimeLocal(s));
  } catch {
    return null;
  }
}

// backend UTC ISO -> <input type="datetime-local" /> (viewer/admin local)
function isoToLocalInput(utcISO?: string | null) {
  if (!utcISO) return null;
  try {
    const d = utcToAdmin(utcISO, adminZone);
    if (!d || !d.isValid()) return null;
    return d.format("YYYY-MM-DDTHH:mm");
  } catch {
    return null;
  }
}

// quick windows computed in viewer/admin zone, stored as UTC ISO
function addDaysISO(days: number) {
  const startLocal = dayjs().tz(adminZone).second(0).millisecond(0);
  const endLocal = startLocal.add(days, "day");
  return {
    startISO: startLocal.utc().toISOString(),
    endISO: endLocal.utc().toISOString(),
  };
}

function addMonthsISO(months: number) {
  const startLocal = dayjs().tz(adminZone).second(0).millisecond(0);
  const endLocal = startLocal.add(months, "month");
  return {
    startISO: startLocal.utc().toISOString(),
    endISO: endLocal.utc().toISOString(),
  };
}

/* ---------------- schema ---------------- */

const createAdBaseZ = z
  .object({
    adOwnerId: z.string().trim().min(1, "Ad owner is required"),

    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().min(1, "Description is required").max(500),

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

  // end after start (timezone-safe)
  if (hasStart && hasEnd) {
    const stISO = localInputToISO(s);
    const etISO = localInputToISO(e);
    const st = stISO ? new Date(stISO).getTime() : NaN;
    const et = etISO ? new Date(etISO).getTime() : NaN;

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
  const [searchParams] = useSearchParams();
  const prefillAdOwnerId = (searchParams.get("adOwnerId") ?? "").trim();
  const prefillAdOwnerName = (searchParams.get("adOwnerName") ?? "").trim();

  const defaultValues = useMemo<CreateAdFormValues>(
    () => ({
      adOwnerId: prefillAdOwnerId || "",
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
    [prefillAdOwnerId],
  );
  const form = useForm<CreateAdFormValues>({
    resolver: zodResolver(createAdZ),
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
  const [adOwnerLabel, setAdOwnerLabel] = useState<string>(
    () => prefillAdOwnerName || "",
  );
  useEffect(() => {
    if (prefillAdOwnerName?.trim() && !adOwnerLabel?.trim()) {
      setAdOwnerLabel(prefillAdOwnerName.trim());
    }
  }, [prefillAdOwnerName, adOwnerLabel]);
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
    onSuccess: (res: any) => {
      appToast.success("Ad created");

      // try common response shapes
      const created =
        res?.data?.data?.data ?? res?.data?.data ?? res?.data ?? null;

      const newId =
        created?._id ?? created?.id ?? res?.data?.data?.data?._id ?? null;

      if (newId) {
        navigate(`/ad/ads/${newId}`);
        return;
      }

      // fallback
      navigate("/ad/ads");
    },
    onError: (err: Error) => {
      console.log("error", err);
      appToast.error("Failed to create ad");
    },
  });

  const isBusy = isPending || imageUploading || isSubmitting;

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

  const clearSchedule = () => {
    setValue("startTime", null, { shouldDirty: true, shouldValidate: true });
    setValue("endTime", null, { shouldDirty: true, shouldValidate: true });
    void form.trigger(["startTime", "endTime"]);
  };

  const onSubmit = async (v: CreateAdFormValues) => {
    // normalize image:
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
      adOwnerId: v.adOwnerId,
      title: v.title,
      description: v.description,
      hyperlink: v.hyperlink?.trim() ? v.hyperlink.trim() : null,
      buttonText: v.buttonText?.trim() ? v.buttonText.trim() : null,

      // ✅ timezone-safe: viewer/admin local -> UTC ISO (Mongo stores UTC)
      startTime: localInputToISO(v.startTime),
      endTime: localInputToISO(v.endTime),

      industries: v.industries ?? [],
      uploadedImageLinks,
      uploadedVideoLinks: v.uploadedVideoLinks ?? [],
    };

    return mutateAsync(payload).catch(() => undefined);
  };

  const selectedOwnerId = watch("adOwnerId");
  // ===== prefill label fallback (if we only have id) =====
  const ownerLookupUrl = useMemo(() => {
    const id = String(selectedOwnerId || "").trim();
    if (!id) return "";
    // includeArchived true so name resolves even if archived
    return endpoints.entities.ad.adOwners.getById(
      { adOwnerId: id },
      { includeArchived: "true" },
    );
  }, [selectedOwnerId]);

  const {
    data: ownerByIdData,
    isLoading: ownerLoading,
    isFetching: ownerFetching,
  } = useApiQuery(ownerLookupUrl, {
    key: ["ad-owner-by-id-create", selectedOwnerId, ownerLookupUrl],
    enabled: !!selectedOwnerId && !adOwnerLabel && !!ownerLookupUrl,
  } as any);

  useEffect(() => {
    if (!selectedOwnerId) return;
    if (adOwnerLabel?.trim()) return;

    const owner = (ownerByIdData as any)?.data?.data ?? null;
    const name = owner?.name ? String(owner.name).trim() : "";

    if (name) setAdOwnerLabel(name);
  }, [selectedOwnerId, adOwnerLabel, ownerByIdData]);
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  const hyperlink = String(watch("hyperlink") || "").trim();
  const ctaText =
    String(watch("buttonText") || "").trim().length > 0
      ? String(watch("buttonText") || "").trim()
      : "Visit";

  const hasSchedule = !!startTime && !!endTime;
  const schedulePreview = useMemo(() => {
    if (!hasSchedule) return null;
    const stISO = localInputToISO(startTime);
    const etISO = localInputToISO(endTime);
    if (!stISO || !etISO) return null;
    return `${utcToAdminFormatted(stISO)} → ${utcToAdminFormatted(etISO)}`;
  }, [hasSchedule, startTime, endTime]);

  return (
    <div className="p-6 space-y-6 w-full max-w-6xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate("/ad/ads")}
            className="shrink-0 rounded-2xl"
            aria-label="Back"
            title="Back"
            disabled={isBusy}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-wide truncate">
              Create Ad
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Build creative, destination and targeting
            </p>
          </div>
        </div>

        <Button
          type="submit"
          form="ad-create-form"
          disabled={isBusy || !isValid}
          className="rounded-2xl"
          title={!isValid ? "Fill required fields to create" : "Create ad"}
        >
          {isBusy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Create
        </Button>
      </div>

      {/* layout */}
      <Form {...form}>
        <form
          id="ad-create-form"
          onSubmit={handleSubmitNormalized(createAdBaseZ, form, onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          noValidate
        >
          {/* LEFT: form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Owner */}
            <Card className="rounded-3xl overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Ownership
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Pick the ad owner for attribution and grouping
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
                      className="px-3 py-1 rounded-full border text-xs bg-background hover:bg-accent/20 transition"
                      title="Remove ad owner"
                      disabled={isBusy}
                    >
                      <span className="max-w-[340px] truncate inline-block align-bottom">
                        {adOwnerLabel ||
                          (ownerLoading || ownerFetching
                            ? "Loading owner…"
                            : selectedOwnerId)}
                      </span>{" "}
                      <span className="ml-1 opacity-70">×</span>
                    </button>
                  </div>
                ) : null}

                {errors.adOwnerId?.message ? (
                  <p className="text-sm text-destructive">
                    {String(errors.adOwnerId.message)}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {/* Content */}
            <Card className="rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Content
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Title and description shown to users
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <TextField<CreateAdFormValues>
                  form={form}
                  schema={createAdBaseZ}
                  name="title"
                  label="Title"
                  placeholder="Enter title"
                  showError
                  showCounter
                />

                <TextAreaField<CreateAdFormValues>
                  form={form}
                  schema={createAdBaseZ}
                  name="description"
                  label="Description"
                  placeholder="Write description"
                  rows={6}
                  showError
                  showCounter
                />
              </CardContent>
            </Card>

            {/* Destination */}
            <Card className="rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Destination
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Link + CTA button label (CTA appears only if link is set)
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                      <div className="text-sm truncate" title={hyperlink}>
                        {hyperlink}
                      </div>
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
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No hyperlink set — CTA won’t show in the ad.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card className="rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Schedule
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Optional run window (timezone-safe; stored in UTC)
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

                {schedulePreview ? (
                  <div className="rounded-2xl border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Preview:
                    </span>{" "}
                    <span className="tabular-nums">{schedulePreview}</span>{" "}
                    <span className="opacity-70">({adminZone})</span>
                  </div>
                ) : null}

                <Separator />

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
                      onClick={clearSchedule}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Targeting */}
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

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    Selected: {(industries ?? []).length}/{MAX_INDUSTRY_PER_AD}
                  </span>
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
                        className="px-3 py-1 rounded-full border text-xs bg-background hover:bg-accent/20 transition"
                        title="Remove industry"
                        disabled={isBusy}
                      >
                        <span className="max-w-[260px] truncate inline-block align-bottom">
                          {industryLabels[id] || id}
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

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 pb-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/ad/ads")}
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
                    Approximate rendering
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
                        <div className="absolute bottom-3 left-3 right-3 min-w-0">
                          <div
                            className="text-white font-semibold text-sm line-clamp-1 break-words"
                            title={String(watch("title") || "")}
                          >
                            {String(watch("title") || "Title")}
                          </div>
                          <div
                            className="text-white/80 text-xs line-clamp-2 mt-1 break-words"
                            title={String(watch("description") || "")}
                          >
                            {String(watch("description") || "Description")}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="p-4 space-y-3">
                      <div className="space-y-1 min-w-0">
                        <div
                          className="text-sm font-semibold line-clamp-1 break-words"
                          title={String(watch("title") || "")}
                        >
                          {String(watch("title") || "Title")}
                        </div>
                        <div
                          className="text-xs text-muted-foreground line-clamp-3 break-words"
                          title={String(watch("description") || "")}
                        >
                          {String(watch("description") || "Description")}
                        </div>
                      </div>

                      {/* CTA only if hyperlink exists. Default label: Visit */}
                      {hyperlink ? (
                        <Button
                          type="button"
                          className="w-full rounded-2xl"
                          onClick={() =>
                            window.open(hyperlink, "_blank", "noreferrer")
                          }
                        >
                          <span className="truncate max-w-full inline-block">
                            {ctaText}
                          </span>
                        </Button>
                      ) : null}

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2">
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span
                            className="truncate"
                            title={schedulePreview || ""}
                          >
                            {schedulePreview ? schedulePreview : "No schedule"}
                          </span>
                        </span>
                        <span className="tabular-nums shrink-0">
                          {(industries ?? []).length}/{MAX_INDUSTRY_PER_AD} tags
                        </span>
                      </div>

                      {!selectedOwnerId ? (
                        <Alert className="rounded-2xl">
                          <AlertDescription className="text-xs text-muted-foreground">
                            Select an Ad Owner to enable creation.
                          </AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
