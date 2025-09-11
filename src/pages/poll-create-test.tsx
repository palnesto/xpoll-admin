// src/features/forms/ResourceAssetsForm.tsx
import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import FileUploadButton from "@/components/file-upload-button";
import { Loader2 } from "lucide-react";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";

/* ---------------- Zod (Form) ---------------- */
const youtubeAssetZ = z.object({
  type: z.literal("youtube"),
  value: z.string().min(11, "YouTube ID or URL").trim(),
});
const imageAssetZ = z.object({
  type: z.literal("image"),
  value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
});
const resourceAssetFormZ = z.union([youtubeAssetZ, imageAssetZ]);

const formSchema = z.object({
  resourceAssets: z.array(resourceAssetFormZ).default([]),
});

type ResourceAssetForm = z.infer<typeof resourceAssetFormZ>;
type FormValues = z.infer<typeof formSchema>;

/* ------------- Output (Final Payload) ------------- */
type OutputResourceAsset =
  | { type: "youtube"; value: string }
  | { type: "image"; value: string };

type OutputPayload = { resourceAssets: OutputResourceAsset[] };

/* -------------- Helpers -------------- */
function extractYouTubeId(input: string): string {
  const s = input.trim();
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m?.[1]) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return s; // fallback
}

/* --------------- Component --------------- */
export default function ResourceAssetsForm() {
  const [showDebug, setShowDebug] = React.useState(true);
  const [addingType, setAddingType] = React.useState<
    null | "youtube" | "image"
  >(null);
  const [ytInput, setYtInput] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { resourceAssets: [] },
  });

  const { control } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "resourceAssets",
  });

  const { uploadImage, loading: imageUploading } = useImageUpload();

  // Watch the entire resourceAssets array
  const resourceAssets = form.watch("resourceAssets");

  // Log full resourceAssets + full form whenever it changes
  React.useEffect(() => {
    console.log("WATCH -> resourceAssets (full):", resourceAssets);
    console.log("WATCH -> full form values:", form.getValues());
    console.log("WATCH -> formState:", form.formState);
  }, [resourceAssets]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- Adders ----- */
  const handleChooseYouTube = () => {
    setAddingType("youtube");
    setYtInput("");
  };

  const handleAddYouTube = () => {
    const value = extractYouTubeId(ytInput);
    append({ type: "youtube", value });
    setAddingType(null);
    setYtInput("");
    console.log("ADD -> youtube appended:", value);
  };

  const handleChooseImage = () => setAddingType("image");

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      // single image per item in the form state
      append({ type: "image", value: [files[0]] });
      console.log("ADD -> image appended (single):", files[0]);
    }
    setAddingType(null);
  };

  /* ----- Submit: upload only image items, collapse to string ----- */
  const onSubmit = async (data: FormValues) => {
    try {
      setSubmitting(true);

      const processed: OutputResourceAsset[] = await Promise.all(
        (data.resourceAssets ?? []).map(
          async (asset): Promise<OutputResourceAsset> => {
            if (asset.type === "youtube") {
              return { type: "youtube", value: extractYouTubeId(asset.value) };
            }

            // image: upload first File if present; if already a string, keep it
            const arr = asset.value ?? [];
            // Given our UI, arr is either [] or [File|string]; we will take the first
            let first = arr[0];
            if (first instanceof File) {
              first = await uploadImage(first);
            }
            // Coerce to string (fallback to empty string if nothing)
            return {
              type: "image",
              value: typeof first === "string" ? first : "",
            };
          }
        )
      );

      const payload: OutputPayload = { resourceAssets: processed };
      console.log(
        "SUBMIT -> FINAL payload (uploaded, image.value is string):",
        payload
      );

      // TODO: call your API mutation here with `payload`
      // upsertHomePageMutate(payload);
    } catch (err) {
      console.error("SUBMIT -> upload error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ----- Debug snapshot (serialize Files) ----- */
  const debugValues = React.useMemo(() => {
    const v = form.getValues();
    const safe = (v.resourceAssets ?? []).map((res) => {
      if (res.type === "image") {
        const arr = res.value ?? [];
        return {
          type: res.type,
          value: arr.map((it) =>
            it instanceof File
              ? { __file__: true, name: it.name, size: it.size, type: it.type }
              : it
          ),
        };
      }
      return res; // youtube: string
    });
    return { resourceAssets: safe };
  }, [resourceAssets]); // keep in sync

  const isBusy = submitting || imageUploading;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Register top-level array so errors show */}
          <FormField
            control={form.control}
            name="resourceAssets"
            render={() => (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Resource Assets</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() =>
                        setAddingType((prev) => (prev ? null : "youtube"))
                      }
                      variant={addingType ? "secondary" : "default"}
                    >
                      + Add
                    </Button>
                  </div>
                </div>

                {/* Add chooser */}
                {!addingType ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleChooseYouTube}
                    >
                      Add YouTube
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleChooseImage}
                    >
                      Add Image
                    </Button>
                  </div>
                ) : addingType === "youtube" ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                    <input
                      className="h-9 w-full max-w-md rounded-md border px-3 text-sm text-black"
                      placeholder="Paste YouTube URL or ID"
                      value={ytInput}
                      onChange={(e) => setYtInput(e.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={handleAddYouTube}
                      disabled={!ytInput.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setAddingType(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  // addingType === "image"
                  <div className="flex items-center gap-2 rounded-md border p-3">
                    <FileUploadButton
                      accept="image/*"
                      multiple={false}
                      onChange={handleImageSelected}
                    >
                      Select Image
                    </FileUploadButton>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setAddingType(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                <FormMessage>
                  {form.formState.errors.resourceAssets &&
                    "Invalid resource assets payload (see console)."}
                </FormMessage>

                {/* Render list with per-item Remove */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {fields.map((field, idx) => {
                    const item = resourceAssets?.[idx] as
                      | ResourceAssetForm
                      | undefined;
                    if (!item) return null;

                    if (item.type === "youtube") {
                      const displayId = extractYouTubeId(item.value);
                      return (
                        <div
                          key={field.id}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <div className="flex min-w-0 flex-col">
                            <div className="text-xs text-muted-foreground">
                              YouTube
                            </div>
                            <div className="truncate text-sm font-medium">
                              {displayId}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              remove(idx);
                              console.log("REMOVE -> youtube at index:", idx);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    }

                    // image item
                    const arr = (item.value ?? []) as (File | string)[];
                    const first = arr[0];
                    const src =
                      first instanceof File
                        ? URL.createObjectURL(first)
                        : first;

                    return (
                      <div
                        key={field.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3"
                      >
                        <div className="flex items-center gap-3">
                          {src ? (
                            <img
                              src={src}
                              alt="image"
                              className="h-16 w-16 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded bg-muted text-xs">
                              no image
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Image
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            remove(idx);
                            console.log("REMOVE -> image at index:", idx);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showDebug}
                onChange={(e) => setShowDebug(e.target.checked)}
              />
              Show debug panel
            </label>

            <Button type="submit" disabled={isBusy}>
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </div>
        </form>
      </Form>

      {showDebug && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            Live Form Debug
          </div>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(debugValues, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
