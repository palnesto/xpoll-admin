// src/pages/ad/ad-owners/create.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  // Backend messages we know:
  // - "Advertisement owner name already exists"
  // - "Industry name already exists"
  return msg.includes("name already exists") || msg.includes("already exists");
}

export default function CreateAdOwnerPage() {
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
  });

  const {
    formState: { isValid, isSubmitting },
    setError,
  } = form;

  const { mutateAsync: createMutateAsync } = useApiMutation<
    { name: string; description: string | null },
    any
  >({
    route: endpoints.entities.ad.adOwners.create,
    method: "POST",
    onSuccess: async (data) => {
      appToast.success("Ad owner created");
      const createdAdOwnerId = data?.data?._id;
      if (!createdAdOwnerId) return navigate("/ad/ad-owners");
      navigate(`/ad/ad-owners/${createdAdOwnerId}`);
    },
    onError: (e: any) => {
      if (isDuplicateNameError(e)) {
        setError("name", {
          type: "server",
          message:
            "This ad owner name already exists. Please use another name.",
        });
        // appToast.error("Ad owner name already exists");
        return;
      }

      // appToast.error(pickApiMessage(e) ?? "Failed to create ad owner");
    },
  });

  const isBusy = isSubmitting;

  const onSubmit = async (v: FormValues) => {
    const payload = {
      name: v.name.trim(),
      description: v.description?.trim() ? v.description.trim() : null,
    };
    await createMutateAsync(payload);
  };

  return (
    <div className="p-6 space-y-8 w-full">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl tracking-wider">Create Ad Owner</h1>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/ad/ad-owners")}
            disabled={isBusy}
            className="text-base font-light tracking-wide"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="ad-owner-form"
            disabled={isBusy || !isValid}
            className="text-base font-light tracking-wide"
          >
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Ad Owner
          </Button>
        </div>
      </div>

      <form
        id="ad-owner-form"
        onSubmit={handleSubmitNormalized(formSchema, form, onSubmit)}
        className="space-y-10"
        noValidate
      >
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-3xl bg-primary/5 p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-base tracking-wider">Basic Info</h2>
              <p className="text-xs text-muted-foreground">
                Name is required. Description is optional.
              </p>
            </div>

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
              rows={5}
              showCounter
              showError
            />
          </div>
        </div>
      </form>
    </div>
  );
}
