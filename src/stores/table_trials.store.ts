import { create } from "zustand";

type TableTrialId = string;
type StateType = TableTrialId | null;

type TableTrialsStoreType = {
  isCreating: StateType;
  setIsCreating: (isCreating: StateType) => void;
  isEditing: StateType;
  setIsEditing: (isEditing: StateType) => void;
  isDeleting: null | Array<string>;
  setIsDeleting: (isDeleting: null | Array<string>) => void;
  onClose: () => void;
};

export const useTableTrialsStore = create<TableTrialsStoreType>()((set) => ({
  isCreating: null,
  setIsCreating: (isCreating) => set({ isCreating }),
  isEditing: null,
  setIsEditing: (isEditing) => set({ isEditing }),
  isDeleting: null,
  setIsDeleting: (isDeleting: Array<string> | null) => set({ isDeleting }),
  onClose: () => set({ isCreating: null, isEditing: null, isDeleting: null }),
}));
