import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { useImageUpload } from "@/hooks/upload/useAssetUpload";

import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";

import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";

/* ---------------- constants ---------------- */

const MAX_INDUSTRY_PER_AD = 3;

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
  if (val.startTime && val.endTime) {
    const s = new Date(val.startTime).getTime();
    const e = new Date(val.endTime).getTime();
    if (!Number.isNaN(s) && !Number.isNaN(e) && e < s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
  }

  if (val.hyperlink) {
    const looksValid =
      /^https?:\/\/.+/i.test(val.hyperlink) ||
      /^www\./i.test(val.hyperlink) ||
      /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(val.hyperlink);

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

  const defaultValues = useMemo<EditAdFormValues>(
    () => ({
      title: "",
      description: "",
      hyperlink: undefined,
      buttonText: undefined,
      startTime: undefined,
      endTime: undefined,
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
  });

  const {
    watch,
    setValue,
    reset,
    formState: { isSubmitting, isValid, errors },
  } = form;

  // ✅ clamp industries
  const industries = watch("industries") ?? [];
  useEffect(() => {
    if (Array.isArray(industries) && industries.length > MAX_INDUSTRY_PER_AD) {
      setValue("industries", industries.slice(0, MAX_INDUSTRY_PER_AD), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [industries, setValue]);

  const { uploadImage, loading: imageUploading } = useImageUpload();

  // --- routes (safe fallback) ---
  const showRoute =
    ((endpoints as any)?.ad?.ads?.getById &&
      (endpoints as any).ad.ads.getById(id)) ||
    ((endpoints as any)?.advertisement?.ads?.getById &&
      (endpoints as any).advertisement.ads.getById(id)) ||
    `/internal/ads/${id}`;

  const editRoute =
    ((endpoints as any)?.ad?.ads?.edit && (endpoints as any).ad.ads.edit(id)) ||
    ((endpoints as any)?.advertisement?.ads?.edit &&
      (endpoints as any).advertisement.ads.edit(id)) ||
    `/internal/ads/${id}`;

  const { data, isLoading, isError } = useApiQuery(showRoute, {
    key: ["GET", showRoute],
    enabled: !!id,
  } as any);

  const ad: any = useMemo(() => {
    return (data as any)?.data?.data ?? (data as any)?.data ?? null;
  }, [data]);

  useEffect(() => {
    if (!ad) return;

    reset({
      title: ad.title ?? "",
      description: ad.description ?? "",
      hyperlink: ad.hyperlink ?? undefined,
      buttonText: ad.buttonText ?? undefined,
      startTime: ad.startTime ?? undefined,
      endTime: ad.endTime ?? undefined,
      industries: Array.isArray(ad.industries)
        ? ad.industries.slice(0, MAX_INDUSTRY_PER_AD)
        : [],
      uploadedImageLinks: Array.isArray(ad.uploadedImageLinks)
        ? ad.uploadedImageLinks.slice(0, 1) // ✅ show stored CDN first
        : [],
      uploadedVideoLinks: Array.isArray(ad.uploadedVideoLinks)
        ? ad.uploadedVideoLinks
        : [],
    });
  }, [ad, reset]);

  const { mutateAsync, isPending } = useApiMutation<any, any>({
    route: editRoute,
    method: "PUT",
    onSuccess: () => {
      appToast.success("Ad updated");
      queryClient.invalidateQueries({ queryKey: ["GET", showRoute] });
      navigate("/ad/ads");
    },
    onError: (err: Error) => {
      console.log("error", err);
      appToast.error("Failed to update ad");
    },
  });

  // --- image preview ---
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

  // ✅ file picker fix
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const isBusy = isLoading || isPending || imageUploading || isSubmitting;

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
      adId: id,
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

  if (!id) return <div className="p-6">Missing ad id in the route.</div>;

  if (isError) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Failed to load this ad.</p>
        <Button
          variant="outline"
          onClick={() => navigate("/ad/ads")}
          className="mt-4"
        >
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 w-full">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl tracking-wider">Edit Ad</h1>

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

            <div className="space-y-2">
              <IndustryInfiniteSelect
                control={(form as any).control}
                name="industries"
                label={`Industries (optional) • max ${MAX_INDUSTRY_PER_AD}`}
              />
              <div className="text-xs text-muted-foreground">
                Selected: {(industries ?? []).length}/{MAX_INDUSTRY_PER_AD}
              </div>
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

          {/* ✅ Image uploader */}
          <div className="space-y-3 rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium tracking-wide">
                  Image (optional)
                </div>
                <div className="text-xs text-muted-foreground">
                  Stored CDN image shows first. Max 1.
                </div>
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
                  <div className="text-xs text-muted-foreground">
                    {imgFirst instanceof File
                      ? "New file selected"
                      : "Stored CDN URL"}
                  </div>
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
              disabled={isBusy}
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
