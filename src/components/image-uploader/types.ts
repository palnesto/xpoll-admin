export interface FileWithPreview {
  file: File;
  id: string;
  preview: string;
  progress: number;
  uploaded: boolean;
  status: "idle" | "uploading" | "uploaded" | "failed"; // Add status
  cdnUrl?: string; // Add this to link files with their CDN URLs
}

export interface UploadError {
  message: string;
}

export interface FileValidationOptions {
  maxFiles: number;
  maxSize: number;
  existingFiles: FileWithPreview[];
}
