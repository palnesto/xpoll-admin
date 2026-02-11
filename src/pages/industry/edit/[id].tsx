// src/pages/industry/edit/[id].tsx
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";

import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { appToast } from "@/utils/toast";
import { utcToAdminFormatted } from "@/utils/time";

type Industry = {
  _id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const formSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().trim().max(2000).optional(),
  })
  .strict();

type FormValues = z.infer<typeof formSchema>;

function pickApiMessage(e: any) {
  return (
    e?.data?.message ||
    e?.response?.data?.message ||
    e?.message ||
    "Request failed"
  );
}

function isDuplicateNameError(e: any) {
  const msg = String(pickApiMessage(e) || "").toLowerCase();
  return msg.includes("name already exists") || msg.includes("already exists");
}

export default function EditIndustryPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const getUrl = useMemo(() => {
    if (!id) return "";
    return endpoints.entities.industry.getById(
      { industryId: id },
      { includeArchived: "true" },
    );
  }, [id]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(getUrl, {
    key: ["industry-by-id-edit", id, getUrl],
    enabled: !!id,
  } as any);

  useEffect(() => {
    if (!getUrl) return;
    try {
      (refetch as any)?.();
    } catch {}
  }, [getUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const industry: Industry | null = (data as any)?.data?.data ?? null;
  const archived = !!industry?.archivedAt;

  const defaultValues: FormValues = useMemo(
    () => ({ name: "", description: undefined }),
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const {
    formState: { isValid, isSubmitting, isDirty },
    reset,
    setError,
  } = form;

  useEffect(() => {
    if (!industry) return;
    reset(
      {
        name: industry.name ?? "",
        description: industry.description ?? undefined,
      },
      { keepDirty: false, keepTouched: false },
    );
  }, [industry, reset]);

  const { mutateAsync: editMutateAsync, isPending } = useApiMutation<
    { name?: string; description?: string | null },
    any
  >({
    route: id ? endpoints.entities.industry.edit(id) : "",
    method: "PATCH",
    onSuccess: () => {
      appToast.success("Industry updated");

      // invalidate view + listing
      const viewUrl = endpoints.entities.industry.getById(
        { industryId: String(id) },
        { includeArchived: "true" },
      );

      queryClient.invalidateQueries({ queryKey: ["GET", viewUrl] });
      queryClient.invalidateQueries({ queryKey: [viewUrl] });

      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = String(q.queryKey?.[0] ?? "");
          return (
            k.includes("/internal/industry/advanced-listing") ||
            k.includes("/internal/industry/") ||
            k.includes("industry-by-id-")
          );
        },
      });

      if (id) navigate(`/industry/${id}`);
      else navigate("/industry");
    },
    onError: (e: any) => {
      if (isDuplicateNameError(e)) {
        setError("name", {
          type: "server",
          message:
            "This industry name already exists. Please use another name.",
        });
        // appToast.error("Industry name already exists");
        return;
      }
      // appToast.error(pickApiMessage(e) ?? "Failed to update industry");
    },
  });

  const isBusy = isLoading || isFetching || isSubmitting || isPending;

  const onSubmit = async (v: FormValues) => {
    if (!id || archived) return;

    const name = v.name.trim();
    const description = v.description?.trim() ? v.description.trim() : null;

    const patch: { name?: string; description?: string | null } = {};
    if (name !== (industry?.name ?? "")) patch.name = name;
    if ((industry?.description ?? null) !== description)
      patch.description = description;

    if (!patch.name && patch.description === undefined) {
      appToast.success("No changes to save");
      return;
    }

    await editMutateAsync(patch);
  };

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() =>
              id ? navigate(`/industry/${id}`) : navigate("/industry")
            }
            className="shrink-0"
            aria-label="Back"
            title="Back"
            disabled={isBusy}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-wide truncate">
              Edit Industry
            </h1>
            <p className="text-xs text-muted-foreground">
              {industry?.updatedAt
                ? `Last updated ${utcToAdminFormatted(industry.updatedAt)}`
                : "Update name/description"}
            </p>
          </div>
        </div>

        {!archived ? (
          <Button
            type="submit"
            form="industry-edit-form"
            size="sm"
            disabled={!id || isBusy || !isValid || !isDirty}
            title={!isDirty ? "No changes" : "Save changes"}
          >
            {(isSubmitting || isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="text-red-500 text-sm">Failed to load industry.</div>
      ) : null}

      {(isLoading || isFetching) && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      )}

      {archived ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          This industry is archived and you can not edit it.
        </div>
      ) : null}

      {!archived ? (
        <form
          id="industry-edit-form"
          onSubmit={handleSubmitNormalized(formSchema, form, onSubmit)}
          className="space-y-6"
          noValidate
        >
          <Card className="rounded-3xl bg-primary/5">
            <CardHeader className="space-y-4">
              <div className="space-y-1">
                <CardTitle className="text-base tracking-wider">
                  Basic Info
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Name is required. Description is optional.
                </CardDescription>
              </div>

              <TextField<FormValues>
                form={form}
                schema={formSchema}
                name="name"
                label="Industry Name"
                placeholder="Enter industry name"
                helperText="Required. Max 200 characters."
                showCounter
                showError
              />

              <TextAreaField<FormValues>
                form={form}
                schema={formSchema}
                name="description"
                label="Description (Optional)"
                placeholder="Write a short description"
                helperText="Optional. Max 2000 characters."
                rows={5}
                showCounter
                showError
              />

              {industry?._id ? (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Industry ID:</span>{" "}
                  <span className="font-mono break-all">{industry._id}</span>
                </div>
              ) : null}
            </CardHeader>
          </Card>
        </form>
      ) : null}
    </div>
  );
}
