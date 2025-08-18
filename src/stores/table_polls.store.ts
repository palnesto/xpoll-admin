import { create } from "zustand";

type TablePollsId = string;
type StateType = TablePollsId | null;

type TablePollsStoreType = {
  isCreating: StateType;
  setIsCreating: (isCreating: StateType) => void;
  isEditing: StateType;
  setIsEditing: (isEditing: StateType) => void;
  isDeleting: StateType;
  setIsDeleting: (isDeleting: StateType) => void;
  onClose: () => void;
};

export const useTablePollsStore = create<TablePollsStoreType>()((set) => ({
  isCreating: null,
  setIsCreating: (isCreating) => set({ isCreating }),
  isEditing: null,
  setIsEditing: (isEditing) => set({ isEditing }),
  isDeleting: null,
  setIsDeleting: (isDeleting) => set({ isDeleting }),
  onClose: () => set({ isCreating: null, isEditing: null, isDeleting: null }),
}));
