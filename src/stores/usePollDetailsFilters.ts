// import { create } from "zustand";
// import { persist } from "zustand/middleware";

// export type Opt = { value: string; label: string; data?: unknown };

// type State = {
//   countryOpts: Opt[];
//   stateOpts: Opt[];
//   cityOpts: Opt[];
//   granularity: "hour" | "day" | "week" | "month";
//   includeArchived: boolean;
//   _hydrated: boolean;

//   patch: (s: Partial<State>) => void;
//   reset: () => void;
// };

// const initial: Omit<State, "patch" | "reset"> = {
//   countryOpts: [],
//   stateOpts: [],
//   cityOpts: [],
//   granularity: "day",
//   includeArchived: false,
//   _hydrated: false,
// };

// export const usePollDetailsFilters = create<State>()(
//   persist(
//     (set, get) => ({
//       ...initial,
//       patch: (s) => set({ ...get(), ...s }),
//       reset: () => set({ ...initial, _hydrated: true }),
//     }),
//     {
//       name: "poll-details-filters",
//       version: 1,
//       onRehydrateStorage: () => (state, error) => {
//         if (!error) {
//           setTimeout(() => {
//             (state as any)?.patch?.({ _hydrated: true });
//           }, 0);
//         }
//       },
//     }
//   )
// );
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Opt = { value: string; label: string; data?: unknown };

type State = {
  countryOpts: Opt[];
  stateOpts: Opt[];
  cityOpts: Opt[];
  granularity: "hour" | "day" | "week" | "month";
  includeArchived: boolean;
  _hydrated: boolean;

  patch: (s: Partial<State>) => void;
  reset: () => void;
};

const initial: Omit<State, "patch" | "reset"> = {
  countryOpts: [],
  stateOpts: [],
  cityOpts: [],
  granularity: "day",
  includeArchived: false,
  _hydrated: false,
};

export const usePollDetailsFilters = create<State>()(
  persist(
    (set, get) => ({
      ...initial,
      patch: (s) => set({ ...get(), ...s }),
      reset: () => set({ ...initial, _hydrated: true }),
    }),
    {
      name: "poll-details-filters",
      version: 1,
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          setTimeout(() => {
            (state as any)?.patch?.({ _hydrated: true });
          }, 0);
        }
      },
    }
  )
);
