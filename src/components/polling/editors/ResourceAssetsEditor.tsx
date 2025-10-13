import React, { useRef, useState } from "react";
import { useFieldArray, type Control, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { extractYouTubeId } from "@/utils/youtube";
import { cn } from "@/lib/utils";
import { FormInput } from "@/components/form/input";
import { useLocation } from "react-router";
import ResourceAssetsPreview from "./ResourceAssetsPreview";

type ResourceAssetType = "image" | "ytVideo";

interface Props {
  control: Control<any>;
  name: string;
  minAssets?: number;
  maxAssets?: number;
  resourceAssetTypes?: ResourceAssetType[]; // accepted types
  mediaAllowed?: Array<"image" | "youtube">;
  isEditing?: boolean;
}

export default function ResourceAssetsEditor({
  control,
  name,
  minAssets = 0,
  maxAssets = 10,
  resourceAssetTypes = ["image", "ytVideo"],
  mediaAllowed,
  isEditing: isEditingProp,
}: Props) {
  const assetsArray = useFieldArray({ control, name });
  const values = useWatch({ control, name }) as any[] | undefined;
  const totalAssets = values?.length ?? 0;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ytInput, setYtInput] = React.useState("");
  const location = useLocation() || {};
  const isNavigationEditing = location?.state?.isNavigationEditing;
  // const [isEditing] = useState(isNavigationEditing ?? false);
  const isEditing =
    typeof isEditingProp === "boolean"
      ? isEditingProp
      : isNavigationEditing ?? false;

  const reachedMax = totalAssets >= maxAssets;

  const legacyAllowImage = resourceAssetTypes.includes("image");
  const legacyAllowYouTube = resourceAssetTypes.includes("ytVideo");

  const allowImage = Array.isArray(mediaAllowed)
    ? mediaAllowed.includes("image")
    : legacyAllowImage;

  const allowYouTube = Array.isArray(mediaAllowed)
    ? mediaAllowed.includes("youtube")
    : legacyAllowYouTube;

  const nothingAllowed =
    Array.isArray(mediaAllowed) && mediaAllowed.length === 0;

  /** Open file dialog on click */
  function handleAddImageClick() {
    if (!allowImage || reachedMax) return;
    fileInputRef.current?.click();
  }

  /** Add selected images to field array */
  function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!allowImage) return;
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0 && !reachedMax) {
      files.forEach((f) => assetsArray.append({ type: "image", value: [f] }));
    }
    e.target.value = ""; // reset so selecting the same file works
  }

  /** Add YouTube */
  function addYouTube() {
    if (!allowYouTube || !ytInput.trim() || reachedMax) return;
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
                src = getYTImageUrl(id);
                label = "YouTube";
              }
            }

            if (!src) return null;

            return (
              <div
                key={idx}
                className="flex items-center justify-between rounded-md bg-black/40 px-2 py-1"
              >
                <ResourceAssetsPreview
                  src={src}
                  label={`${label} ${idx + 1}`}
                />
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

      {isEditing ? (
        <div
          className={cn("flex flex-col gap-4", {
            "pl-4": totalAssets > 0,
          })}
        >
          {/* When nothing is allowed, show a soft hint and no inputs */}
          {nothingAllowed ? (
            <p className="text-sm text-zinc-500">
              No media types are allowed for this form.
            </p>
          ) : (
            <>
              {/* + Add Image */}
              {allowImage && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-zinc-500">
                    + Add Image{" "}
                    {reachedMax && (
                      <span className="text-xs">(max reached)</span>
                    )}
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
              {allowYouTube && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-zinc-500">
                    Add YouTube{" "}
                    {reachedMax && (
                      <span className="text-xs">(max reached)</span>
                    )}
                  </p>

                  <div className="relative flex flex-col gap-2">
                    <FormInput
                      placeholder="Paste YouTube link or ID"
                      value={ytInput}
                      onChange={(e) => setYtInput(e.target.value)}
                      disabled={reachedMax}
                    />
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
            </>
          )}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

export const getYTImageUrl = (id: string) => {
  const url = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  return url;
};
