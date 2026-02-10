import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Opt<T = unknown> = { value: string; label: string; data?: T };

type State = {
  // filters
  name: string;
  description: string;

  /**
   * API expects includeArchived boolean.
   * - false => show only non-archived
   * - true  => include archived too
   */
  includeArchived: boolean;

  /**
   * Selected excluded owners (we store full options to keep label for chips).
   * This maps to API query param: excludeIds=id1,id2
   */
  excludedOwnerOpts: Opt[];

  // paging
  page: number;

  // UI nonce to re-mount fields on hard reset (if needed)
  uiNonce: number;

  patch: (partial: Partial<State>) => void;
  reset: () => void;
};

const initialBase = {
  name: "",
  description: "",
  includeArchived: false,
  excludedOwnerOpts: [] as Opt[],
  page: 1,
};

const initial: Omit<State, "patch" | "reset"> = {
  ...initialBase,
  uiNonce: 0,
};

export const useAdOwnerFilters = create<State>()(
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
    { name: "ad-owner-filters" },
  ),
);
