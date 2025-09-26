import { appToast } from "@/utils/toast";
import { useState } from "react";

/**
 * 1) Grab the folder name from .env
 *    e.g. VITE_DO_PROJECT_FOLDER="project_a/module_b"
 *    If not set, we'll throw an error so no uploads happen without it.
 */
const folderName = import.meta.env.VITE_DO_PROJECT_FOLDER;
if (!folderName) {
  console.error("No folder name specified in env (VITE_DO_PROJECT_FOLDER)!");
  // You could throw an error or handle it however you like:
  // throw new Error("Missing folder name in env");
}

/**
 * Fetch the presigned POST data from the backend,
 * which returns { signedUrl, fields, fileName }.
 * We also pass the file's MIME type as 'fileType' and folderName
 */
async function fetchPresignedPostData(
  fileName: string,
  fileType: string,
  shouldSameUrl: boolean = false
): Promise<{
  signedUrl: string;
  fields: Record<string, string>;
  fileName: string;
}> {
  if (!folderName) {
    appToast.error("No folder name specified in env (VITE_DO_PROJECT_FOLDER)!");
    throw new Error(
      "No folder name specified (VITE_DO_PROJECT_FOLDER). Aborting upload."
    );
  }

  const res = await fetch(
    `${import.meta.env.VITE_BACKEND_URL}/utils/signed-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Include cookies in the request
      body: JSON.stringify({
        file: { fileName, fileType },
        folderName, // pass folder name here
        shouldSameUrl,
      }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch presigned POST data");
  }
  return await res.json();
}

/**
 * Upload the file to DigitalOcean Spaces
 * using the presigned POST data: { signedUrl, fields }.
 */
async function uploadFileUsingPost(
  signedUrl: string,
  fields: Record<string, string>,
  file: File
): Promise<string> {
  const formData = new FormData();

  // Append all fields from the presigned POST:
  Object.entries(fields).forEach(([k, v]) => {
    formData.append(k, v);
  });

  // Append the actual file
  formData.append("file", file);

  // POST to the 'signedUrl'
  const response = await fetch(signedUrl, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("File upload failed");
  }

  // Typically: final URL is signedUrl + fields.key (encoded)
  // NOTE: Some folks do `signedUrl + "/" + encodeURIComponent(fields.key)`,
  // but your `getUniquePresignedPostUrl` might already omit the trailing slash.
  const finalUrl = `${signedUrl}${encodeURIComponent(fields.key)}`;
  return finalUrl;
}

/**
 * Extract the object key from the final URL
 * (if needed for further operations).
 */
export function extractKey(url: string): string {
  const parts = url.split(".com/");
  if (parts.length < 2) throw new Error("Cannot extract key from URL");
  // decode then strip any leading slash
  return decodeURIComponent(parts[1].split("?")[0]).replace(/^\/+/, "");
}

/**
 * Shared hook for uploading ANY file type.
 */
function useAssetUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadAsset(file: File, assetConfig: object) {
    setLoading(true);
    setError(null);
    try {
      // 1) Get presigned POST data from server (pass file.type!)
      const { signedUrl, fields, publicUrl } = await fetchPresignedPostData(
        file.name,
        file.type
      );

      // 2) Upload the file to Spaces via POST
      const finalFileUrl = await uploadFileUsingPost(signedUrl, fields, file);

      // 3) Optionally "make-public" or further finalization
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/utils/make-public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies in the request
        body: JSON.stringify({
          file: { fileName: extractKey(finalFileUrl) },
          assetConfig, // optional
        }),
      });

      return publicUrl;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, uploadAsset };
}

/**
 * useImageUpload
 */
export function useImageUpload() {
  const { loading, error, uploadAsset } = useAssetUpload();
  async function uploadImage(
    file: File,
    cropParams?: { x: number; y: number; width: number; height: number },
    compress: boolean = true
  ) {
    return await uploadAsset(file, {
      imageProps: { cropParams, compress },
    });
  }

  return { loading, error, uploadImage };
}

/**
 * useVideoUpload
 */
export function useVideoUpload() {
  const { loading, error, uploadAsset } = useAssetUpload();
  async function uploadVideo(
    file: File,
    trimParams?: { start: number; end: number },
    cropParams?: { x: number; y: number; width: number; height: number },
    compression: boolean = false
  ) {
    return await uploadAsset(file, {
      videoProps: { trimParams, cropParams, compression },
    });
  }

  return { loading, error, uploadVideo };
}

/**
 * usePdfUpload
 */
export function usePdfUpload() {
  const { loading, error, uploadAsset } = useAssetUpload();
  async function uploadPdf(file: File, compress: boolean = true) {
    return await uploadAsset(file, {
      pdfProps: { compress },
    });
  }

  return { loading, error, uploadPdf };
}

export default useAssetUpload;
