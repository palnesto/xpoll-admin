import type { InkdBlogData, MediaState, MediaType } from "./inkd-blog-edit.types";
import { safeArr } from "./inkd-blog-edit.utils";

export function detectMediaType(b: InkdBlogData): MediaType {
  if (safeArr(b.uploadedVideoLinks)[0]) return "video";
  if (safeArr(b.uploadedImageLinks)[0]) return "image";
  if (safeArr(b.ytVideoLinks)[0]) return "youtube";
  return "none";
}

export function detectMediaState(b: InkdBlogData): MediaState {
  const vid = safeArr(b.uploadedVideoLinks)[0];
  const img = safeArr(b.uploadedImageLinks)[0];
  const yt = safeArr(b.ytVideoLinks)[0];
  if (vid) return { type: "video", urls: [String(vid)], files: [], previews: [String(vid)] };
  if (img) return { type: "image", urls: [String(img)], files: [], previews: [String(img)] };
  if (yt) return { type: "youtube", ytIds: [String(yt)] };
  return { type: "none" };
}
