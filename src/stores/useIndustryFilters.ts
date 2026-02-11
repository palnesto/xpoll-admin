import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Opt<T = unknown> = { value: string; label: string; data?: T };

type State = {
  name: string;
  description: string;

  /**
   * API expects includeArchived boolean.
   * - false => show only non-archived
   * - true  => include archived too
   */
  includeArchived: boolean;

  /**
   * Selected excluded industries (store full option for chips).
   * Maps to API query param: excludeIds=id1,id2
   */
  excludedIndustryOpts: Opt[];

  page: number;

  uiNonce: number;

  patch: (partial: Partial<State>) => void;
  reset: () => void;
};

const initialBase = {
  name: "",
  description: "",
  includeArchived: false,
  excludedIndustryOpts: [] as Opt[],
  page: 1,
};

const initial: Omit<State, "patch" | "reset"> = {
  ...initialBase,
  uiNonce: 0,
};

export const useIndustryFilters = create<State>()(
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
    { name: "industry-filters" },
  ),
);
