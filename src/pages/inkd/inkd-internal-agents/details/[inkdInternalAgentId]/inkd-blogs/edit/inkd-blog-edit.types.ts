export type MediaType = "image" | "video" | "youtube" | "none";

export type MediaState =
  | { type: "none" }
  | { type: "image"; urls?: string[]; files?: File[]; previews?: string[] }
  | { type: "video"; urls?: string[]; files?: File[]; previews?: string[] }
  | { type: "youtube"; ytIds?: string[] };

export type InkdBlogData = {
  _id: string;
  title: string;
  description: string;
  externalLinks: string[];
  uploadedImageLinks: string[];
  uploadedVideoLinks: string[];
  ytVideoLinks: string[];
  targetGeo: { countries: string[]; states: string[]; cities: string[] } | null;
  linkedIndustries: { _id: string; name: string }[];
};
