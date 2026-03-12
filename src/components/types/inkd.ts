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