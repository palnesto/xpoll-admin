import React from "react";
import { ProgressBar } from "./progress-bar";
import { FileWithPreview } from "./types";
import { cn } from "@/lib/utils";

interface FileListProps {
  files: FileWithPreview[];
  onRetry: (file: FileWithPreview) => void; // Add Retry Callback
  onRemove: (id: string) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onRetry,
  onRemove,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4 p-2 rounded-lg overflow-y-auto max-h-72 bg-background">
      {files.map((file) => (
        <div
          key={file.id}
          className={cn(
            "rounded-lg p-3 sm:p-4 shadow-lg",
            "border border-border",
            "transition-all duration-200",
            "hover:shadow-primary/10",
            "bg-card"
          )}
        >
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-muted">
              <img
                src={file.preview}
                alt={file.file.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {file.file.name}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {(file.file.size / 1024).toFixed(1)} KB
              </p>
              <ProgressBar progress={file.progress} />
            </div>
            <div className="flex items-center space-x-2">
              {file?.status === "failed" && (
                <button
                  onClick={() => onRetry(file)}
                  className="text-sm text-primary hover:underline"
                  aria-label={`Retry uploading ${file.file.name}`}
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => onRemove(file.id)}
                className="p-1 rounded-full transition-colors text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${file.file.name}`}
              >
                ✖
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
