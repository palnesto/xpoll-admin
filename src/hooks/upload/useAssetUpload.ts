// // src/hooks/upload/useAssetUpload.ts
// import { useState } from "react";

// type UploadScope = "poll" | "trial" | "trialPoll";

// /** Root folder is fixed server-side; here we only send scope. */
// const BACKEND = import.meta.env.VITE_BACKEND_URL;
// if (!BACKEND) {
//   console.error("Missing VITE_BACKEND_URL");
// }

// /** --- 1) Signed POST fetcher (now robust to different shapes) --- */
// async function fetchPresignedPostData(
//   fileName: string,
//   fileType: string,
//   scope: UploadScope,
//   shouldSameUrl: boolean = false
// ): Promise<{
//   signedUrl: string; // final POST endpoint (aka url)
//   fields: Record<string, string>; // form fields to include in POST
//   fileName: string;
// }> {
//   const res = await fetch(`${BACKEND}/utils/signed-url`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     credentials: "include",
//     body: JSON.stringify({
//       file: { fileName, fileType },
//       scope,
//       shouldSameUrl,
//     }),
//   });

//   if (!res.ok) {
//     const text = await res.text().catch(() => "");
//     throw new Error(
//       `Failed to fetch presigned POST data (${res.status}). ${
//         text || ""
//       }`.trim()
//     );
//   }

//   // Be tolerant to { url, fields }, { signedUrl, fields } and wrappers like { data: { ... } }
//   let raw: any;
//   try {
//     raw = await res.json();
//   } catch {
//     throw new Error("Presign endpoint did not return JSON");
//   }

//   const payload = raw?.data ?? raw;
//   const signedUrl: string =
//     payload?.signedUrl ?? payload?.url ?? payload?.uploadUrl ?? "";

//   const fields: Record<string, string> =
//     payload?.fields ?? payload?.formFields ?? payload?.postData?.fields ?? null;

//   if (!signedUrl || typeof signedUrl !== "string") {
//     console.error("[presign] Unexpected payload (missing url):", payload);
//     throw new Error("Invalid presign payload: missing url");
//   }
//   if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
//     console.error("[presign] Unexpected payload (missing fields):", payload);
//     throw new Error("Invalid presign payload: missing fields");
//   }

//   return { signedUrl, fields, fileName };
// }

// /** --- 2) POST the file directly to S3/Spaces --- */
// async function uploadFileUsingPost(
//   signedUrl: string,
//   fields: Record<string, string>,
//   file: File
// ): Promise<string> {
//   if (!fields || typeof fields !== "object") {
//     throw new Error("Invalid presign payload: fields not an object");
//   }

//   const formData = new FormData();
//   for (const [k, v] of Object.entries(fields)) {
//     formData.append(k, v);
//   }
//   formData.append("file", file);

//   const resp = await fetch(signedUrl, { method: "POST", body: formData });
//   if (!resp.ok) {
//     const text = await resp.text().catch(() => "");
//     throw new Error(
//       `File upload failed (${resp.status}). ${text || ""}`.trim()
//     );
//   }

//   // For S3/Spaces, the public URL is typically `${url}${fields.key}`
//   const objectKey = fields.key;
//   if (!objectKey) {
//     console.warn("[upload] Presign fields missing 'key'. Returning POST url.");
//     return signedUrl;
//   }

//   // Don't encode slashes in the key — S3/Spaces treats them as path separators
//   const finalUrl = signedUrl.endsWith("/")
//     ? `${signedUrl}${objectKey}`
//     : `${signedUrl}/${objectKey}`;

//   return finalUrl;
// }

// /** --- 3) Key extractor (from final URL) --- */
// export function extractKey(url: string): string {
//   const parts = url.split(".com/");
//   if (parts.length < 2) throw new Error("Cannot extract key from URL");
//   return decodeURIComponent(parts[1].split("?")[0]).replace(/^\/+/, "");
// }

// /** --- 4) Hook API --- */
// function useAssetUpload() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   async function uploadSingle(
//     file: File,
//     scope: UploadScope,
//     assetConfig?: object
//   ) {
//     setLoading(true);
//     setError(null);
//     try {
//       const { signedUrl, fields } = await fetchPresignedPostData(
//         file.name,
//         file.type || "application/octet-stream",
//         scope
//       );

//       const finalFileUrl = await uploadFileUsingPost(signedUrl, fields, file);

//       // Optional: ensure public-read (skip if policy already sets ACL)
//       fetch(`${BACKEND}/utils/make-public`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify({
//           file: { fileName: extractKey(finalFileUrl) },
//           assetConfig,
//         }),
//       }).catch(() => {
//         /* non-blocking */
//       });

//       return finalFileUrl;
//     } catch (err: any) {
//       setError(err?.message || "Upload failed");
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function uploadBulk(
//     files: File[],
//     scope: UploadScope,
//     assetConfig?: object
//   ) {
//     // Run sequentially to avoid rate/acl issues; you can switch to Promise.all if your backend allows
//     const urls: string[] = [];
//     for (const f of files) {
//       const u = await uploadSingle(f, scope, assetConfig);
//       urls.push(u);
//     }
//     return urls;
//   }

//   return { loading, error, uploadSingle, uploadBulk };
// }

// /** --- image-specialized wrappers --- */
// export function useImageUpload() {
//   const base = useAssetUpload();
//   return {
//     loading: base.loading,
//     error: base.error,
//     uploadPollImage: (file: File) => base.uploadSingle(file, "poll"),
//     uploadTrialImage: (file: File) => base.uploadSingle(file, "trial"),
//     uploadTrialPollImage: (file: File) => base.uploadSingle(file, "trialPoll"),
//     uploadPollImages: (files: File[]) => base.uploadBulk(files, "poll"),
//     uploadTrialImages: (files: File[]) => base.uploadBulk(files, "trial"),
//     uploadTrialPollImages: (files: File[]) =>
//       base.uploadBulk(files, "trialPoll"),
//   };
// }

// export default useAssetUpload;

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
      const { signedUrl, fields } = await fetchPresignedPostData(
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

      return finalFileUrl;
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
