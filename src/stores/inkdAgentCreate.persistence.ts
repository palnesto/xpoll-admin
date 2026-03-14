import type { InkdAgentCreateFormValues } from "@/schema/inkd-agent-create.schema";

const FORM_STORE_EXPIRY_MS = 30 * 60 * 1000;

export function getStoreKey(userId: string | undefined): string {
  return `xpoll-inkd-admin-agent-create-${userId ?? "anon"}`;
}

export type PersistedFormPayload = {
  data: Partial<InkdAgentCreateFormValues>;
  expireAt: number | null;
  countryOpts?: unknown[];
  stateOpts?: unknown[];
  cityOpts?: unknown[];
  industryOpts?: unknown[];
};

export function readPersistedForm(userId: string | undefined): PersistedFormPayload {
  try {
    const raw = window.localStorage.getItem(getStoreKey(userId));
    if (!raw) return { data: {}, expireAt: null };
    const parsed = JSON.parse(raw) as {
      data?: Partial<InkdAgentCreateFormValues>;
      expireAt?: number;
      countryOpts?: unknown[];
      stateOpts?: unknown[];
      cityOpts?: unknown[];
      industryOpts?: unknown[];
    };
    if (!parsed?.data || !parsed.expireAt) {
      return { data: {}, expireAt: null };
    }
    if (Date.now() > parsed.expireAt) {
      window.localStorage.removeItem(getStoreKey(userId));
      return { data: {}, expireAt: null };
    }
    return {
      data: parsed.data,
      expireAt: parsed.expireAt,
      countryOpts: parsed.countryOpts,
      stateOpts: parsed.stateOpts,
      cityOpts: parsed.cityOpts,
      industryOpts: parsed.industryOpts,
    };
  } catch {
    return { data: {}, expireAt: null };
  }
}

export function writePersistedForm(
  userId: string | undefined,
  data: InkdAgentCreateFormValues,
  extra?: Record<string, unknown>,
): void {
  const payload = {
    data,
    expireAt: Date.now() + FORM_STORE_EXPIRY_MS,
    ...extra,
  };
  try {
    window.localStorage.setItem(getStoreKey(userId), JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export function clearPersistedForm(userId: string | undefined): void {
  try {
    window.localStorage.removeItem(getStoreKey(userId));
  } catch {
    // ignore
  }
}
