import React from "react";
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
  resourceAssetTypes?: ResourceAssetType[]; // accepted types (legacy)
  mediaAllowed?: Array<"image" | "youtube">; // preferred allowlist
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

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [ytInput, setYtInput] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const location = useLocation() || ({} as any);
  const isNavigationEditing = location?.state?.isNavigationEditing;
  const isEditing =
    typeof isEditingProp === "boolean"
      ? isEditingProp
      : isNavigationEditing ?? false;

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

  const remaining = Math.max(0, maxAssets - totalAssets);
  const reachedMax = remaining === 0;

  function showNotice(msg: string) {
    setNotice(msg);
    // auto-clear after 3 seconds
    window.clearTimeout((showNotice as any)._t);
    (showNotice as any)._t = window.setTimeout(() => setNotice(null), 3000);
  }

  /** Open file dialog on click */
  function handleAddImageClick() {
    if (!allowImage) return;
    if (reachedMax) {
      showNotice(`You've reached the maximum of ${maxAssets} item(s).`);
      return;
    }
    fileInputRef.current?.click();
  }

  /** Add selected images to field array (hard-capped) */
  function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!allowImage) return;

    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const curRemaining = Math.max(0, maxAssets - (values?.length ?? 0));

    if (curRemaining <= 0) {
      showNotice(`You've reached the maximum of ${maxAssets} item(s).`);
      e.target.value = "";
      return;
    }

    const allowedFiles = files.slice(0, curRemaining);
    allowedFiles.forEach((f) =>
      assetsArray.append({ type: "image", value: [f] })
    );

    if (files.length > allowedFiles.length) {
      const extra = files.length - allowedFiles.length;
      showNotice(
        `Only ${curRemaining} more allowed. Skipped ${extra} extra file${
          extra > 1 ? "s" : ""
        }.`
      );
    }

    e.target.value = ""; // reset so selecting the same file works
  }

  /** Add YouTube (hard-capped) */
  function addYouTube() {
    if (!allowYouTube) return;

    const input = ytInput.trim();
    if (!input) return;

    const curRemaining = Math.max(0, maxAssets - (values?.length ?? 0));
    if (curRemaining <= 0) {
      showNotice(`You've reached the maximum of ${maxAssets} item(s).`);
      return;
    }

    const id = extractYouTubeId(input);
    if (!id) {
      showNotice("Invalid YouTube link or ID.");
      return;
    }

    assetsArray.append({ type: "youtube", value: id });
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
          {/* counter */}
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Media</span>
            <span className={cn({ "text-zinc-400": reachedMax })}>
              {totalAssets}/{maxAssets} used
            </span>
          </div>

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
          {/* Inline notice */}
          {notice && (
            <div className="rounded-md border border-yellow-600/40 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-300">
              {notice}
            </div>
          )}

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
                  <p className="text-sm text-zinc-500">+ Add Image </p>

                  <div
                    onClick={handleAddImageClick}
                    className={cn(
                      "flex h-16 w-full items-center justify-center rounded-lg bg-dark-sidebar text-zinc-400 transition-colors",
                      reachedMax
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer hover:bg-dark-sidebar/80"
                    )}
                    aria-disabled={reachedMax}
                    role="button"
                  >
                    <span className="text-xl">+</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple={(values?.length ?? 0) < maxAssets}
                    onChange={onImageSelected}
                    className="hidden"
                    disabled={reachedMax}
                  />
                </div>
              )}

              {/* Add YouTube */}
              {allowYouTube && (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-zinc-500">Add YouTube</p>

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
                        size={"sm"}
                        className="bg-zinc-800 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
                        disabled={!ytInput.trim() || reachedMax}
                        onClick={addYouTube}
                      >
                        Embed
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer cap indicator */}
              <div className="text-xs text-zinc-500">
                {reachedMax
                  ? `Maximum of ${maxAssets} item(s) reached. Remove one to add more.`
                  : `${remaining} slot${remaining > 1 ? "s" : ""} remaining.`}
              </div>
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
