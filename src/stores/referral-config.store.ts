// // src/stores/referral-config.store.ts
// import { create } from "zustand";
// import { persist } from "zustand/middleware";

// export type ReferralReward = {
//   assetId: string;
//   amount: number;
// };

// export type ReferralLevel = {
//   totalUniqueVisitsRequired: number;
//   rewards: ReferralReward[];
// };

// type ReferralConfigState = {
//   referral_levels: ReferralLevel[];
//   setConfig: (cfg: { referral_levels: ReferralLevel[] }) => void;
//   updateLevels: (levels: ReferralLevel[]) => void;
//   reset: () => void;
// };

// export const useReferralConfigStore = create<ReferralConfigState>()(
//   persist(
//     (set) => ({
//       referral_levels: [],
//       setConfig: (cfg) =>
//         set(() => ({
//           referral_levels: cfg.referral_levels,
//         })),
//       updateLevels: (levels) =>
//         set(() => ({
//           referral_levels: levels,
//         })),
//       reset: () =>
//         set(() => ({
//           referral_levels: [],
//         })),
//     }),
//     {
//       name: "referral-config-store",
//     }
//   )
// );
// src/stores/referral-config.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReferralReward = {
  assetId: string;
  amount: number; // BASE units
};

export type ReferralLevel = {
  totalUniqueVisitsRequired: number;
  rewards: ReferralReward[];
};

type ReferralConfigState = {
  referral_levels: ReferralLevel[];
  setConfig: (cfg: { referral_levels: ReferralLevel[] }) => void;
  updateLevels: (levels: ReferralLevel[]) => void;
  reset: () => void;
};

export const useReferralConfigStore = create<ReferralConfigState>()(
  persist(
    (set) => ({
      referral_levels: [],
      setConfig: (cfg) =>
        set(() => ({
          referral_levels: cfg.referral_levels,
        })),
      updateLevels: (levels) =>
        set(() => ({
          referral_levels: levels,
        })),
      reset: () =>
        set(() => ({
          referral_levels: [],
        })),
    }),
    {
      name: "referral-config-store",
    }
  )
);
