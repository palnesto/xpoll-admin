import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Opt<T = unknown> = { value: string; label: string; data?: T };

export type AdStatus = "draft" | "scheduled" | "live" | "ended";

type State = {
  // filters
  title: string;
  description: string;

  includeArchived: boolean;

  // backend supports:
  // - adOwner (single search field matching owner _id OR name OR description)
  // - adOwnerId exact
  adOwner: string;
  adOwnerId: string | null;

  status: AdStatus | "";

  // industries filter (query param: industryIds=id1,id2)
  industryIds: string[];

  // excludeIds=id1,id2
  excludedAdOpts: Opt[];

  // paging
  page: number;

  // UI nonce
  uiNonce: number;

  patch: (partial: Partial<State>) => void;
  reset: () => void;
};

const initialBase = {
  title: "",
  description: "",
  includeArchived: false,

  adOwner: "",
  adOwnerId: null,

  status: "" as "" | AdStatus,

  industryIds: [] as string[],
  excludedAdOpts: [] as Opt[],

  page: 1,
};

const initial: Omit<State, "patch" | "reset"> = {
  ...initialBase,
  uiNonce: 0,
};

export const useAdFilters = create<State>()(
  persist(
    (set) => ({
      ...initial,
      patch: (partial) => set((s) => ({ ...s, ...partial })),
      reset: () =>
        set((s) => ({
          ...initialBase,
          uiNonce: s.uiNonce + 1,
        })),
    }),
    { name: "ads-filters" },
  ),
);
