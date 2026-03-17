export type InkdSignal = {
    id: string;
    slug: string;
    title: string;
    status: "Active" | "Paused";
    blogsGenerated: number;
    locationCount: number;
    category: string;
    nextPostTime: string;
  };
  
  export type InkdSignalItem = {
    id: string;
    signalSlug: string;
    title: string;
    image: string;
    rewards: {
      label: string;
      amount: number;
    }[];
    trailsCount: number;
    publishedLabel: string;
  };

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
