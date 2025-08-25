import { useSlugViewStore } from "@/stores/slug.store";
import { useForm } from "react-hook-form";
import { CustomModal } from "../custom-modal";
import { useApiMutation } from "@/hooks/useApiMutation"; // adjust import path
import { useState } from "react";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";

type SlugDoc = { _id: string; name: string };

type Props = {
  onCreated: (opt: { value: string; label: string; data: SlugDoc }) => void;
};

type FormValues = { name: string };

export function SlugCreateModal({ onCreated }: Props) {
  const { isAddSlug, onClose } = useSlugViewStore();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { name: (isAddSlug ?? "").toLowerCase().trim() },
    values: { name: (isAddSlug ?? "").toLowerCase().trim() }, // keep in sync when store changes
  });

  const [submitting, setSubmitting] = useState(false);

  const mutation = useApiMutation<FormValues, { data: SlugDoc }>({
    route: endpoints.entities.slug.create,
    method: "POST",
    onSuccess: (res) => {
      const doc = res?.data;
      if (doc) {
        const opt = { value: doc._id, label: doc.name, data: doc };
        onCreated(opt);
      }
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.slug.all],
      });
      reset({ name: "" });
      onClose();
      setSubmitting(false);
    },
    onError: () => {
      setSubmitting(false);
    },
  });

  const onSubmit = handleSubmit((vals) => {
    setSubmitting(true);
    mutation.mutate({ names: [vals.name] });
  });

  const isOpen = !!isAddSlug;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create slug"
      onSubmit={onSubmit}
      submitButtonText={submitting ? "Creating..." : "Create"}
      isSubmitting={submitting}
      needX
      contentContainerClass="w-full max-w-lg"
    >
      <div className="space-y-3 px-1">
        <label className="block text-sm font-medium">Slug name</label>
        <input
          autoFocus
          {...register("name", { required: true })}
          className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 focus:outline-none"
          placeholder="e.g. politics"
        />
        <p className="text-xs opacity-70">
          Slugs are stored as trimmed lowercase. Duplicates are ignored by the
          API.
        </p>
      </div>
    </CustomModal>
  );
}
