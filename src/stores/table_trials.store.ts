import { create } from "zustand";

type DeleteTrialsState = {
  pollId: string;
  title: string;
};
type TableTrialId = string;
type StateType = TableTrialId | null;

type TableTrialsStoreType = {
  isCreating: StateType;
  setIsCreating: (isCreating: StateType) => void;
  isEditing: StateType;
  setIsEditing: (isEditing: StateType) => void;
  isDeleting: null | Array<DeleteTrialsState>;
  setIsDeleting: (isDeleting: null | Array<DeleteTrialsState>) => void;
  onClose: () => void;
};

export const useTableTrialsStore = create<TableTrialsStoreType>()((set) => ({
  isCreating: null,
  setIsCreating: (isCreating) => set({ isCreating }),
  isEditing: null,
  setIsEditing: (isEditing) => set({ isEditing }),
  isDeleting: null,
  setIsDeleting: (isDeleting: Array<DeleteTrialsState> | null) =>
    set({ isDeleting }),
  onClose: () => set({ isCreating: null, isEditing: null, isDeleting: null }),
}));
