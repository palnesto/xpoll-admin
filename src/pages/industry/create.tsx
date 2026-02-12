// src/pages/industry/create.tsx

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { handleSubmitNormalized } from "@/components/commons/form/utils/rhfSubmit";

import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { appToast } from "@/utils/toast";

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

export default function CreateIndustryPage() {
  const navigate = useNavigate();

  const defaultValues: FormValues = useMemo(
    () => ({
      name: "",
      description: undefined,
    }),
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
    criteriaMode: "firstError",
    shouldFocusError: true,
  });

  const {
    formState: { isValid, isSubmitting },
    setError,
  } = form;

  const { mutateAsync, isPending, error } = useApiMutation<
    { name: string; description: string | null },
    any
  >({
    route: endpoints.entities.industry.create,
    method: "POST",
    onSuccess: (data) => {
      appToast.success("Industry created");

      // be tolerant to different response shapes
      const createdId =
        data?.data?._id ?? data?.data?.data?._id ?? data?.data?.id ?? null;

      if (createdId) return navigate(`/industry/${createdId}`);
      navigate("/industry");
    },
    onError: (e: any) => {
      if (isDuplicateNameError(e)) {
        setError("name", {
          type: "server",
          message:
            "This industry name already exists. Please use another name.",
        });
        return;
      }
      appToast.error(pickApiMessage(e) ?? "Failed to create industry");
    },
  });

  const isBusy = isSubmitting || isPending;

  const onSubmit = async (v: FormValues) => {
    const payload = {
      name: v.name.trim(),
      description: v.description?.trim() ? v.description.trim() : null,
    };
    await mutateAsync(payload);
  };

  return (
    <div className="p-6 space-y-6 w-full max-w-4xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate("/industry")}
            className="shrink-0 rounded-2xl"
            aria-label="Back"
            title="Back"
            disabled={isBusy}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-wide truncate">
              Create Industry
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Create an industry tag used for targeting and categorization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/industry")}
            disabled={isBusy}
            className="rounded-2xl"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="industry-create-form"
            disabled={isBusy || !isValid}
            className="rounded-2xl"
            title={!isValid ? "Fill required fields to create" : "Create"}
          >
            {isBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Create
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{pickApiMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      <Form {...form}>
        <form
          id="industry-create-form"
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
