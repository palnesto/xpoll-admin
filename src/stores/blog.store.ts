import { create } from "zustand";

type BlogId = string;
type StateType = BlogId | null;

type BlogStoreType = {
  isDeleting: StateType;
  setIsDeleting: (id: StateType) => void;
  onClose: () => void;
};

export const useBlogStore = create<BlogStoreType>()((set) => ({
  isDeleting: null,
  setIsDeleting: (id) => set({ isDeleting: id }),
  onClose: () => set({ isDeleting: null }),
}));
