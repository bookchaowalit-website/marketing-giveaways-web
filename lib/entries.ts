export const STATUSES = ["Open", "Draft", "Closed"] as const;
export type Status = (typeof STATUSES)[number];
export type Entry = { id: string; title: string; body: string; status: Status; createdAt: number };

export const MAX_TITLE = 80;
export const MAX_BODY = 400;

/** Case-insensitive match against title, details, and status. */
export function filterEntries(entries: Entry[], query: string): Entry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return entries;
  return entries.filter((entry) => `${entry.title} ${entry.body} ${entry.status}`.toLowerCase().includes(needle));
}

export type Draft = { title: string; body: string; status: Status };

const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;

/** Cut to `max` UTF-16 units without leaving half of a surrogate pair (emoji) behind. */
export function clipText(value: string, max: number): string {
  if (value.length <= max) return value;
  const end = /[\uD800-\uDBFF]/.test(value[max - 1]) ? max - 1 : max;
  return value.slice(0, end);
}

/** Largest |timestamp| a JS Date accepts; beyond it toISOString() throws. */
const MAX_DATE_MS = 8.64e15;

export function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= MAX_DATE_MS;
}

export function createEntry(draft: Draft, id: string, now: number): Entry | { error: string } {
  const title = clipText(draft.title.trim(), MAX_TITLE);
  if (!title.replace(INVISIBLE, "").trim()) return { error: "A ticket needs a title before it can be filed." };
  return { id, title, body: clipText(draft.body.trim(), MAX_BODY) || "No details", status: draft.status, createdAt: now };
}

/** "01 TICKET" / "02 TICKETS" for the header counter. */
export function ticketCount(count: number): string {
  return `${String(count).padStart(2, "0")} ${count === 1 ? "TICKET" : "TICKETS"}`;
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** Parses localStorage content, dropping anything that is not a well-formed entry. */
export function parseStoredEntries(raw: string | null): Entry[] | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw.replace(/^\uFEFF/, ""));
    if (!Array.isArray(data)) return null;
    const seen = new Set<string>();
    return data.filter((item): item is Entry => {
      if (typeof item !== "object" || item === null) return false;
      const entry = item as Record<string, unknown>;
      // A timestamp outside the Date range would make toISOString() throw and
      // crash the rack; a repeated id would collide as a React key.
      const ok = typeof entry.id === "string" && !seen.has(entry.id) && typeof entry.title === "string" && typeof entry.body === "string" && isStatus(entry.status) && isValidTimestamp(entry.createdAt);
      if (ok) seen.add(entry.id as string);
      return ok;
    });
  } catch {
    return null;
  }
}
