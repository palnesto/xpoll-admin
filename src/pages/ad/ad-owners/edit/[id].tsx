// src/pages/ad/ad-owners/edit/[id].tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";

import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { appToast } from "@/utils/toast";

type AdOwner = {
  _id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
};

const formSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().trim().max(2000).nullable().optional(),
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

export default function EditAdOwnerPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();

  const showUrl = useMemo(() => {
    if (!id) return "";
    return endpoints.entities.ad.adOwners.getById(
      { adOwnerId: id },
      { includeArchived: "true" },
    );
  }, [id]);

  const { data, isLoading, isFetching, isError } = useApiQuery(showUrl, {
    key: ["ad-owner-by-id-edit", id, showUrl],
    enabled: !!id,
  } as any);

  const owner: AdOwner | null = (data as any)?.data?.data ?? null;
  const archived = !!owner?.archivedAt;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: null },
    mode: "onChange",
    criteriaMode: "firstError",
    shouldFocusError: true,
  });

  const {
    reset,
    setError,
    formState: { isSubmitting, isValid },
  } = form;

  const [original, setOriginal] = useState<{
    name: string;
    description: string | null;
  }>({
    name: "",
    description: null,
  });

  useEffect(() => {
    if (!owner) return;
    const next = {
      name: String(owner.name ?? ""),
      description: owner.description?.trim() ? String(owner.description) : null,
    };
    reset(next, { keepDirty: false, keepTouched: false });
    setOriginal(next);
  }, [owner, reset]);

  const { mutateAsync, isPending } = useApiMutation<any, any>({
    // ✅ ensure your endpoints has `edit(adOwnerId)` similar to ads:
    route: endpoints.entities.ad.adOwners.edit(id),
    method: "PATCH",
    onSuccess: () => {
      appToast.success("Ad owner updated");
      navigate(`/ad/ad-owners/${id}`);
    },
    onError: (e: any) => {
      if (isDuplicateNameError(e)) {
        setError("name", {
          type: "server",
          message:
            "This ad owner name already exists. Please use another name.",
        });
        return;
      }
      appToast.error(pickApiMessage(e) ?? "Failed to update ad owner");
    },
  });

  const isBusy = isLoading || isFetching || isSubmitting || isPending;

  const onSubmit = async (v: FormValues) => {
    const payload = {
      name: v.name.trim(),
      description: v.description?.trim() ? v.description.trim() : null,
    };
    await mutateAsync(payload);
  };

  if (!id) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-sm text-muted-foreground">
          Missing ad owner id.
        </div>
        <Button variant="secondary" onClick={() => navigate("/ad/ad-owners")}>
          Back
        </Button>
      </div>
    );
  }

  if (isError && !isBusy) {
    return (
      <div className="p-6 space-y-3">
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>Failed to load ad owner.</AlertDescription>
        </Alert>
        <Button variant="secondary" onClick={() => navigate("/ad/ad-owners")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-4xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate(`/ad/ad-owners/${id}`)}
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
                Edit Ad Owner
              </h1>
              {archived ? (
                <Badge className="rounded-full bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/15">
                  Archived
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Update owner metadata
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            disabled={isBusy}
            onClick={() => {
              reset(original, { keepDirty: false, keepTouched: false });
            }}
            title="Reset to original values loaded from server"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>

          <Button
            type="submit"
            form="ad-owner-edit-form"
            disabled={isBusy || !isValid || archived}
            className="rounded-2xl"
            title={
              archived ? "Archived owners cannot be edited" : "Save changes"
            }
          >
            {isBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      {isLoading || isFetching ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : null}

      {archived ? (
        <Alert className="rounded-2xl border-red-500/30 bg-red-500/10">
          <AlertDescription className="text-red-200">
            This ad owner is archived. Editing and saving is disabled.
          </AlertDescription>
        </Alert>
      ) : null}

      <Form {...form}>
        <form
          id="ad-owner-edit-form"
          onSubmit={handleSubmitNormalized(formSchema, form, onSubmit)}
          className="space-y-6"
          noValidate
        >
          <Card className="rounded-3xl overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Basic Info
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                Name is required. Description is optional.
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <TextField<FormValues>
                form={form}
                schema={formSchema}
                name="name"
                label="Owner Name"
                placeholder="Enter owner name"
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
                rows={6}
                showCounter
                showError
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
