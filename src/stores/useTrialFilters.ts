import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Tri = "all" | "true" | "false";
export type Opt = { value: string; label: string };

type State = {
  // title-only search
  search: string;

  // MULTI selects (store full options so we can show labels on chips)
  countryOpts: Opt[];
  stateOpts: Opt[];
  cityOpts: Opt[];
  assetOpts: Opt[]; // e.g. [{ value: "xPoll", label: "xPoll" }]

  // tri-state singles
  expired: Tri;
  exhausted: Tri;

  // paging
  page: number;

  // UI nonce to re-mount selects on hard reset
  uiNonce: number;

  patch: (partial: Partial<State>) => void;
  reset: () => void;
};

const initialBase = {
  search: "",
  countryOpts: [] as Opt[],
  stateOpts: [] as Opt[],
  cityOpts: [] as Opt[],
  assetOpts: [] as Opt[],
  expired: "all" as Tri,
  exhausted: "all" as Tri,
  page: 1,
};

const initial: Omit<State, "patch" | "reset"> = {
  ...initialBase,
  uiNonce: 0,
};

export const useTrialFilters = create<State>()(
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
    { name: "trial-filters" }
  )
);
