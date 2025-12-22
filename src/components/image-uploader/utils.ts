import { FileValidationOptions, UploadError } from "./types";

export const validateFiles = (
  files: File[],
  options: FileValidationOptions
) => {
  const errors: UploadError[] = [];
  const validFiles: File[] = [];

  if (files.length + options.existingFiles.length > options.maxFiles) {
    errors.push({
      message: `You can only upload up to ${options.maxFiles} files at a time.`,
    });
    return { validFiles, errors };
  }

  files.forEach((file) => {
    if (file.size > options.maxSize) {
      errors.push({
        message: `${file.name} is too large. Maximum file size is ${
          options.maxSize / 1024 / 1024
        }MB.`,
      });
    } else if (!file.type.startsWith("image/")) {
      errors.push({
        message: `${file.name} is not an image file.`,
      });
    } else {
      validFiles.push(file);
    }
  });

  return { validFiles, errors };
};
