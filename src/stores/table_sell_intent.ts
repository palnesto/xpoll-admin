import { create } from "zustand";

type TableSellIntentStoreType = {
  isAccepting: null | Array<string>;
  setIsAccepting: (isAccepting: null | Array<string>) => void;
  isRejecting: null | Array<string>;
  setIsRejecting: (isRejecting: null | Array<string>) => void;
  onClose: () => void;
};

export const useTableSellIntentStore = create<TableSellIntentStoreType>()(
  (set) => ({
    isAccepting: null,
    setIsAccepting: (isAccepting) => set({ isAccepting }),
    isRejecting: null,
    setIsRejecting: (isRejecting: Array<string> | null) => set({ isRejecting }),
    onClose: () => set({ isAccepting: null, isRejecting: null }),
  })
);
