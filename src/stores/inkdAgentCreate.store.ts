import { create } from "zustand";

export type InkdAgentRewardInput = {
  assetId: string;
  amount: string;
  rewardAmountCap: string;
  rewardType: "min" | "max";
};

export type InkdAgentCreateFormData = {
  name: string;
  foundationalInformation: string;
  brandLanguage: string;
  maxBlogDescriptionLength: number;
  maxLinkedTrial: number;
  maxLinkedPoll: number;
  prioritySources: string[];
  fallbackImageUrl: string;
  rewards: InkdAgentRewardInput[];
};

export const DEFAULT_INKD_AGENT_CREATE_DATA: InkdAgentCreateFormData = {
  name: "",
  foundationalInformation: "",
  brandLanguage: "",
  maxBlogDescriptionLength: 500,
  maxLinkedTrial: 10,
  maxLinkedPoll: 10,
  prioritySources: [],
  fallbackImageUrl: "",
  rewards: [],
};

type StoreState = {
  data: InkdAgentCreateFormData;
  setData: (partial: Partial<InkdAgentCreateFormData>) => void;
  reset: () => void;
};

export const useInkdAgentCreateStore = create<StoreState>((set) => ({
  data: DEFAULT_INKD_AGENT_CREATE_DATA,
  setData: (partial) =>
    set((state) => ({
      data: {
        ...state.data,
        ...partial,
      },
    })),
  reset: () => set({ data: DEFAULT_INKD_AGENT_CREATE_DATA }),
}));

