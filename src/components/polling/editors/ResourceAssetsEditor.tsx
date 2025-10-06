import React, { useRef } from "react";
import { useFieldArray, type Control, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { extractYouTubeId } from "@/utils/youtube";
import { cn } from "@/lib/utils";
import { FormInput } from "@/components/form/input";

type ResourceAssetType = "image" | "ytVideo";

interface Props {
  control: Control<any>;
  name: string;
  minAssets?: number;
  maxAssets?: number;
  resourceAssetTypes?: ResourceAssetType[]; // accepted types
}

export default function ResourceAssetsEditor({
  control,
  name,
  minAssets = 0,
  maxAssets = 10,
  resourceAssetTypes = ["image", "ytVideo"],
}: Props) {
  const assetsArray = useFieldArray({ control, name });
  const values = useWatch({ control, name }) as any[] | undefined;
  const totalAssets = values?.length ?? 0;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ytInput, setYtInput] = React.useState("");

  const reachedMax = totalAssets >= maxAssets;

  /** Open file dialog on click */
  function handleAddImageClick() {
    if (reachedMax) return;
    fileInputRef.current?.click();
  }

  /** Add selected images to field array */
  function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0 && !reachedMax) {
      files.forEach((f) => assetsArray.append({ type: "image", value: [f] }));
    }
    e.target.value = ""; // reset so selecting the same file works
  }

  /** Add YouTube */
  function addYouTube() {
    if (!ytInput.trim() || reachedMax) return;
    const id = extractYouTubeId(ytInput.trim());
    if (!id) return;
    assetsArray.append({
      type: "youtube",
      value: id,
    });
    setYtInput("");
  }

  /** Remove asset */
  function removeAsset(idx: number) {
    assetsArray.remove(idx);
  }

  return (
    <div
      className={cn("grid divide-zinc-500", {
        "grid-cols-2 divide-x-2": totalAssets > 0,
        "grid-cols-1": totalAssets === 0,
      })}
    >
      {/* Render Media */}
      {totalAssets > 0 && (
        <div className="pr-4 flex flex-col gap-2">
          {values?.map((item, idx) => {
            let src = "";
            let label = "";

            if (item.type === "image") {
              const arr = (item.value ?? []) as (File | string)[];
              const first = arr[0];
              src = first instanceof File ? URL.createObjectURL(first) : first;
              label = "Image";
            }

            if (item.type === "youtube") {
              const id = extractYouTubeId(item.value);
              if (id) {
                src = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
                label = "YouTube";
              }
            }

            if (!src) return null;

            return (
              <div
                key={idx}
                className="flex items-center justify-between rounded-md bg-black/40 px-2 py-1"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <img
                    src={src}
                    alt={label}
                    className="h-10 w-10 rounded object-cover flex-shrink-0"
                  />
                  <p className="truncate text-sm text-zinc-100">
                    {label} {idx + 1}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAsset(idx)}
                  className="text-zinc-400 hover:text-zinc-200 transition"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new items */}
      <div
        className={cn("flex flex-col gap-4", {
          "pl-4": totalAssets > 0,
        })}
      >
        {/* + Add Image */}
        {resourceAssetTypes.includes("image") && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-zinc-500">
              + Add Image{" "}
              {reachedMax && <span className="text-xs">(max reached)</span>}
            </p>

            <div
              onClick={handleAddImageClick}
              className={cn(
                "flex h-16 w-full items-center justify-center rounded-lg bg-dark-sidebar text-zinc-400 transition-colors",
                reachedMax
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer hover:bg-dark-sidebar/80"
              )}
            >
              <span className="text-xl">+</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onImageSelected}
              className="hidden"
              disabled={reachedMax}
            />
          </div>
        )}

        {/* Add YouTube */}
        {resourceAssetTypes.includes("ytVideo") && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-zinc-500">
              Add YouTube{" "}
              {reachedMax && <span className="text-xs">(max reached)</span>}
            </p>

            <div className="relative flex flex-col gap-2">
              <FormInput
                placeholder="Paste YouTube link or ID"
                value={ytInput}
                onChange={(e) => setYtInput(e.target.value)}
                disabled={reachedMax}
              />
              {/* <Input
                placeholder="Paste YouTube link or ID"
                value={ytInput}
                onChange={(e) => setYtInput(e.target.value)}
                disabled={reachedMax}
                className={cn(
                  "h-10 w-full rounded-md border-0 bg-zinc-900 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-600",
                  reachedMax && "opacity-50 cursor-not-allowed"
                )}
              /> */}
              <div className="flex justify-end">
                <Button
                  type="button"
                  className="bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50"
                  disabled={!ytInput.trim() || reachedMax}
                  onClick={addYouTube}
                >
                  Embed
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
