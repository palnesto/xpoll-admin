import { useEffect, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useImageUpload } from "./hooks/useImageUpload";
import { DigitalOceanService } from "./services/upload-service";
import { DropZone } from "./drop-zone";
import { FileList } from "./file-list";
import { ImageCarousel } from "../image";

const digitalOceanService = new DigitalOceanService(
  import.meta.env.VITE_DO_SPACES_NAME!,
  import.meta.env.VITE_DO_SPACES_REGION!,
  import.meta.env.VITE_DO_SPACES_ACCESS_KEY!,
  import.meta.env.VITE_DO_SPACES_SECRET_KEY!,
  import.meta.env.VITE_DO_SPACES_CDN_ENDPOINT!
);

interface ImageUploaderProps {
  onUploadComplete?: (uploadedUrls: string[]) => void;
  multiple?: boolean;
  validationOptions?: {
    maxFiles?: number;
    maxSize?: number;
  };
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  multiple = true,
  validationOptions,
}) => {
  const { files, errors, onDrop, removeFile, uploadFile } = useImageUpload(
    digitalOceanService,
    undefined,
    validationOptions
  );
  const currentFiles = useMemo(
    () =>
      files
        .filter((file) => file.uploaded && file.cdnUrl)
        .map((file) => file.cdnUrl as string),
    [files]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    multiple,
  });

  const previousUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const currentUploadedUrls = files
      .filter((file) => file.uploaded && file.cdnUrl)
      .map((file) => file.cdnUrl as string);

    // Check if uploaded URLs have changed before invoking the callback
    if (
      onUploadComplete &&
      JSON.stringify(currentUploadedUrls) !==
        JSON.stringify(previousUrlsRef.current)
    ) {
      onUploadComplete(currentUploadedUrls);
      previousUrlsRef.current = currentUploadedUrls;
    }
  }, [files, onUploadComplete]);

  return (
    <div className="flex flex-col xl:flex-row gap-5">
      {currentFiles?.length > 0 && (
        <div className="w-full">
          <ImageCarousel images={currentFiles} initialAutoPlay={false} />
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto ">
        <DropZone
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}
          maxFiles={validationOptions?.maxFiles ?? 5}
          maxFileSize={validationOptions?.maxSize ?? 5 * 1024 * 1024}
        />

        {errors && errors.length > 0 && (
          <div className="mt-3 sm:mt-4">
            {errors.map((error, index) => (
              <p key={index} className="text-red-400 text-sm">
                {error.message}
              </p>
            ))}
          </div>
        )}

        {files && files.length > 0 && (
          <div className="mt-4 sm:mt-6 space-y-4">
            <FileList
              files={files}
              onRetry={uploadFile}
              onRemove={removeFile}
            />
          </div>
        )}
      </div>
    </div>
  );
};
