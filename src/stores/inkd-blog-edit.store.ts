import { create } from "zustand";

const PERSIST_KEY_PREFIX = "xpoll-inkd-blog-edit";
const BLOG_EDIT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export type GeoOption = { value: string; label: string };
export type IndustryOption = { value: string; label: string };

export type InkdBlogEditDraft = {
  title?: string;
  description?: string;
  externalLinks?: string[];
  uploadedImageLinks?: string[];
  uploadedVideoLinks?: string[];
  ytVideoLinks?: string[];
  targetGeo?: { countries: string[]; states: string[]; cities: string[] } | null;
  industryIds?: string[];
  industryOpts?: IndustryOption[];
};

export type InkdBlogEditPayload = {
  blogId: string;
  inkdInternalAgentId: string | null;
  expireAt: number;
  draft: InkdBlogEditDraft;
};

export function getInkdBlogEditPersistKey(userId: string): string {
  return `${PERSIST_KEY_PREFIX}-${userId}`;
}

type InkdBlogEditStore = {
  blogId: string | null;
  inkdInternalAgentId: string | null;
  expireAt: number;
  draft: InkdBlogEditDraft | null;
  setDraft: (payload: InkdBlogEditPayload | null) => void;
  getDraft: () => InkdBlogEditPayload | null;
  setPatch: (userId: string, patch: Partial<InkdBlogEditDraft>) => void;
  clear: (userId: string) => void;
  isExpired: () => boolean;
  loadFromLocalStorage: (userId: string) => void;
};

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export const useInkdBlogEditStore = create<InkdBlogEditStore>()((set, get) => ({
  blogId: null,
  inkdInternalAgentId: null,
  expireAt: 0,
  draft: null,

  setDraft: (payload) =>
    set({
      blogId: payload?.blogId ?? null,
      inkdInternalAgentId: payload?.inkdInternalAgentId ?? null,
      expireAt: payload?.expireAt ?? 0,
      draft: payload?.draft ?? null,
    }),

  getDraft: () => {
    const s = get();
    if (!s.draft) return null;
    return {
      blogId: s.blogId!,
      inkdInternalAgentId: s.inkdInternalAgentId,
      expireAt: s.expireAt,
      draft: s.draft,
    };
  },

  setPatch: (userId, patch) => {
    const key = getInkdBlogEditPersistKey(userId);
    const current = get();
    const expireAt = Date.now() + BLOG_EDIT_TTL_MS;
    const merged: InkdBlogEditDraft = {
      ...(current.draft ?? {}),
      ...patch,
    };
    const payload: InkdBlogEditPayload = {
      blogId: current.blogId ?? "",
      inkdInternalAgentId: current.inkdInternalAgentId,
      expireAt,
      draft: merged,
    };
    set({ blogId: payload.blogId, inkdInternalAgentId: payload.inkdInternalAgentId, expireAt, draft: merged });
    safeSet(key, JSON.stringify(payload));
  },

  clear: (userId) => {
    const key = getInkdBlogEditPersistKey(userId);
    safeRemove(key);
    set({ blogId: null, inkdInternalAgentId: null, expireAt: 0, draft: null });
  },

  isExpired: () => {
    const s = get();
    return !s.expireAt || Date.now() > s.expireAt;
  },

  loadFromLocalStorage: (userId) => {
    const key = getInkdBlogEditPersistKey(userId);
    const raw = safeGet(key);
    if (!raw) {
      set({ blogId: null, inkdInternalAgentId: null, expireAt: 0, draft: null });
      return;
    }
    try {
      const parsed = JSON.parse(raw) as InkdBlogEditPayload | null;
      if (
        !parsed ||
        typeof parsed.blogId !== "string" ||
        typeof parsed.expireAt !== "number" ||
        !parsed.draft
      ) {
        set({ blogId: null, inkdInternalAgentId: null, expireAt: 0, draft: null });
        return;
      }
      if (Date.now() > parsed.expireAt) {
        safeRemove(key);
        set({ blogId: null, inkdInternalAgentId: null, expireAt: 0, draft: null });
        return;
      }
      set({
        blogId: parsed.blogId,
        inkdInternalAgentId: parsed.inkdInternalAgentId ?? null,
        expireAt: parsed.expireAt,
        draft: parsed.draft,
      });
    } catch {
      set({ blogId: null, inkdInternalAgentId: null, expireAt: 0, draft: null });
    }
  },
}));
