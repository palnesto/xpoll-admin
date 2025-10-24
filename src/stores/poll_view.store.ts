import { create } from "zustand";

type AddOptionValue = {
  pollId: string;
} | null;

type EditOptionValue = {
  pollId: string;
  optionId: string;
  oldText: string;
} | null;

type ArchiveToggleOptionValue = {
  pollId: string;
  optionId: string;
  shouldArchive: boolean;
  optionText?: string;
} | null;

type PollViewStore = {
  isAddOption: AddOptionValue;
  setIsAddOption: (isAddOption: AddOptionValue) => void;

  isEditOption: EditOptionValue;
  setIsEditOption: (isEditOption: EditOptionValue) => void;

  isArchiveToggleOption: ArchiveToggleOptionValue;
  setIsArchiveToggleOption: (
    isArchiveToggleOption: ArchiveToggleOptionValue
  ) => void;

  onClose: () => void;
};

export const usePollViewStore = create<PollViewStore>((set) => ({
  isAddOption: null,
  setIsAddOption: (isAddOption: AddOptionValue) => set({ isAddOption }),

  isEditOption: null,
  setIsEditOption: (isEditOption: EditOptionValue) => set({ isEditOption }),

  isArchiveToggleOption: null,
  setIsArchiveToggleOption: (isArchiveToggleOption: ArchiveToggleOptionValue) =>
    set({ isArchiveToggleOption }),

  onClose: () =>
    set({ isAddOption: null, isEditOption: null, isArchiveToggleOption: null }),
}));
