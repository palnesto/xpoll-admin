import type { InkdAgentApiDetail } from "@/schema/inkd-agent-edit.schema";

const EDIT_CACHE_KEY = "xpoll-inkd-admin-agent-edit";
const EDIT_EXPIRY_MS = 30 * 60 * 1000;

type StoredEdit = {
  editAgentId: string;
  editData: InkdAgentApiDetail;
  editExpireAt: number;
};

function read(): StoredEdit | null {
  try {
    const raw = window.localStorage.getItem(EDIT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEdit;
    if (!parsed?.editAgentId || !parsed?.editData || !parsed?.editExpireAt)
      return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(editAgentId: string, editData: InkdAgentApiDetail): void {
  try {
    const payload: StoredEdit = {
      editAgentId,
      editData,
      editExpireAt: Date.now() + EDIT_EXPIRY_MS,
    };
    window.localStorage.setItem(EDIT_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function clear(): void {
  try {
    window.localStorage.removeItem(EDIT_CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Get cached edit data for current agent; null if none, wrong agent, or expired */
export function getEditCacheForAgent(agentId: string): InkdAgentApiDetail | null {
  const d = read();
  if (!d) return null;
  if (d.editAgentId !== agentId) return null;
  if (Date.now() > d.editExpireAt) return null;
  return d.editData;
}

/** Store API response as edit cache for this agent (agent id stored in value, not in key) */
export function setEditCache(agentId: string, data: InkdAgentApiDetail): void {
  write(agentId, data);
}

export function clearEditCache(): void {
  clear();
}
