import { create } from "zustand";

type AddSlugValue = string | null;

type SlugViewStore = {
  isAddSlug: AddSlugValue;
  setIsAddSlug: (isAddSlug: AddSlugValue) => void;
  onClose: () => void;
};

export const useSlugViewStore = create<SlugViewStore>((set) => ({
  isAddSlug: null,
  setIsAddSlug: (isAddSlug: AddSlugValue) => set({ isAddSlug }),
  onClose: () => set({ isAddSlug: null }),
}));
