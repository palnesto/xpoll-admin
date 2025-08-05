import { create } from "zustand";

export interface AdminUser {
  id: string;
  email: string;
  isSuperAdmin: boolean;
}

interface AdminAuthState {
  user: AdminUser | null;
  setUser: (u: AdminUser | null) => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
