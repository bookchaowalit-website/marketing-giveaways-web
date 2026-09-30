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

export function createEntry(draft: Draft, id: string, now: number): Entry | { error: string } {
  const title = draft.title.trim().slice(0, MAX_TITLE);
  if (!title) return { error: "A ticket needs a title before it can be filed." };
  return { id, title, body: draft.body.trim().slice(0, MAX_BODY) || "No details", status: draft.status, createdAt: now };
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** Parses localStorage content, dropping anything that is not a well-formed entry. */
export function parseStoredEntries(raw: string | null): Entry[] | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    return data.filter((item): item is Entry => {
      if (typeof item !== "object" || item === null) return false;
      const entry = item as Record<string, unknown>;
      return typeof entry.id === "string" && typeof entry.title === "string" && typeof entry.body === "string" && isStatus(entry.status) && typeof entry.createdAt === "number";
    });
  } catch {
    return null;
  }
}
