export function stripHtmlToText(html: string): string {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasMeaningfulText(html: string): boolean {
  return stripHtmlToText(html).length > 0;
}

export function isValidExternalLink(v: string): boolean {
  const s = String(v ?? "").trim();
  if (!s) return true;
  try {
    const url = s.startsWith("http") ? s : `https://${s}`;
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function normalizeExternalLink(v: string): string {
  const s = String(v ?? "").trim();
  if (!s) return s;
  return s.startsWith("http") ? s : `https://${s}`;
}

export function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}
