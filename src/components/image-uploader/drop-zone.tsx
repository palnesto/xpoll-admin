import React from "react";
import { Upload } from "lucide-react";
import { DropzoneRootProps, DropzoneInputProps } from "react-dropzone";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  getRootProps: (props?: DropzoneRootProps) => DropzoneRootProps;
  getInputProps: (props?: DropzoneInputProps) => DropzoneInputProps;
  isDragActive: boolean;
  maxFiles: number;
  maxFileSize: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  getRootProps,
  getInputProps,
  isDragActive,
  maxFiles,
  maxFileSize,
}) => {
  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center cursor-pointer",
        "transition-all duration-200",
        "bg-card hover:bg-muted/50",
        "border-border hover:border-primary/50",
        isDragActive && "border-primary bg-primary/10 scale-[1.02]"
      )}
    >
      <input {...getInputProps()} />
      <Upload
        className={cn(
          "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto mb-2 sm:mb-3 md:mb-4",
          "text-muted-foreground"
        )}
      />
      <p className="text-base sm:text-lg mb-1 sm:mb-2 font-medium text-foreground">
        {isDragActive
          ? "Drop the files here..."
          : "Drag & drop images here, or click to select"}
      </p>
      <p className="text-xs sm:text-sm text-muted-foreground">
        Supports: JPG, PNG, GIF (max {maxFiles} files, up to{" "}
        {maxFileSize / 1024 / 1024}MB each)
      </p>
    </div>
  );
};
