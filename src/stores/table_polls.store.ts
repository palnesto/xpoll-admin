import { create } from "zustand";

type DeletePollsState = {
  pollId: string;
  title: string;
};
type TablePollsId = string;
type StateType = TablePollsId | null;

type TablePollsStoreType = {
  isCreating: StateType;
  setIsCreating: (isCreating: StateType) => void;
  isEditing: StateType;
  setIsEditing: (isEditing: StateType) => void;
  isDeleting: null | Array<DeletePollsState>;
  setIsDeleting: (isDeleting: null | Array<DeletePollsState>) => void;
  onClose: () => void;
};

export const useTablePollsStore = create<TablePollsStoreType>()((set) => ({
  isCreating: null,
  setIsCreating: (isCreating) => set({ isCreating }),
  isEditing: null,
  setIsEditing: (isEditing) => set({ isEditing }),
  isDeleting: null,
  setIsDeleting: (isDeleting: Array<DeletePollsState> | null) =>
    set({ isDeleting }),
  onClose: () => set({ isCreating: null, isEditing: null, isDeleting: null }),
}));
