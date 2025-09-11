import React from "react";
import { useFieldArray, type Control, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileUploadButton from "@/components/file-upload-button";
import { extractYouTubeId } from "@/utils/youtube";

type Props = {
  control: Control<any>;
  name: string; // e.g. "resourceAssets" or "trial.resourceAssets" or `polls.${i}.resourceAssets`
  label?: string;
};

export default function ResourceAssetsEditor({
  control,
  name,
  label = "Resource Assets",
}: Props) {
  const assetsArray = useFieldArray({ control, name });
  const values = useWatch({ control, name }) as any[] | undefined;

  const [adding, setAdding] = React.useState<null | "youtube" | "image">(null);
  const [ytInput, setYtInput] = React.useState("");

  function addYouTube() {
    assetsArray.append({
      type: "youtube",
      value: extractYouTubeId(ytInput.trim()),
    });
    setAdding(null);
    setYtInput("");
  }

  function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      assetsArray.append({ type: "image", value: [files[0]] });
    }
    setAdding(null);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {!adding ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdding("youtube")}
          >
            Add YouTube
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdding("image")}
          >
            Add Image
          </Button>
        </div>
      ) : adding === "youtube" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
          <Input
            className="h-9 w-full max-w-md"
            placeholder="Paste YouTube URL or ID"
            value={ytInput}
            onChange={(e) => setYtInput(e.target.value)}
          />
          <Button type="button" onClick={addYouTube} disabled={!ytInput.trim()}>
            Add
          </Button>
          <Button type="button" variant="ghost" onClick={() => setAdding(null)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border p-3">
          <FileUploadButton
            accept="image/*"
            multiple={false}
            onChange={onImageSelected}
          >
            Select Image
          </FileUploadButton>
          <Button type="button" variant="ghost" onClick={() => setAdding(null)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {assetsArray.fields.map((f, idx) => {
          const item = values?.[idx];
          if (!item) return null;

          if (item.type === "youtube") {
            const id = extractYouTubeId(item.value);
            return (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex min-w-0 flex-col">
                  <div className="text-xs text-muted-foreground">YouTube</div>
                  <div className="truncate text-sm font-medium">{id}</div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => assetsArray.remove(idx)}
                >
                  Remove
                </Button>
              </div>
            );
          }

          const arr = (item.value ?? []) as (File | string)[];
          const first = arr[0];
          const src =
            first instanceof File ? URL.createObjectURL(first) : first;

          return (
            <div
              key={f.id}
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
                <div className="text-xs text-muted-foreground">Image</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => assetsArray.remove(idx)}
              >
                Remove
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
