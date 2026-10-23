import { describe, expect, it } from "vitest";
import { createEntry, filterEntries, parseStoredEntries, ticketCount, type Entry } from "@/lib/entries";

const entries: Entry[] = [
  { id: "1", title: "Sticker pack", body: "Comment to enter", status: "Open", createdAt: 1 },
  { id: "2", title: "Poster", body: "Share the post", status: "Closed", createdAt: 2 },
];

describe("filterEntries", () => {
  it("matches title, body and status case-insensitively", () => {
    expect(filterEntries(entries, "STICKER").map((e) => e.id)).toEqual(["1"]);
    expect(filterEntries(entries, "share").map((e) => e.id)).toEqual(["2"]);
    expect(filterEntries(entries, "closed").map((e) => e.id)).toEqual(["2"]);
    expect(filterEntries(entries, "  ")).toHaveLength(2);
  });
});

describe("createEntry", () => {
  it("requires a title and fills in default details", () => {
    expect(createEntry({ title: "  ", body: "", status: "Open" }, "x", 5)).toHaveProperty("error");
    expect(createEntry({ title: " Mug ", body: " ", status: "Draft" }, "x", 5)).toEqual({ id: "x", title: "Mug", body: "No details", status: "Draft", createdAt: 5 });
  });
});

describe("parseStoredEntries", () => {
  it("returns null for missing or corrupt storage", () => {
    expect(parseStoredEntries(null)).toBeNull();
    expect(parseStoredEntries("{not json")).toBeNull();
    expect(parseStoredEntries('{"a":1}')).toBeNull();
  });

  it("keeps only well-formed entries", () => {
    const raw = JSON.stringify([...entries, { id: 3, title: "bad" }, { ...entries[0], id: "4", status: "Won" }]);
    expect(parseStoredEntries(raw)?.map((e) => e.id)).toEqual(["1", "2"]);
  });
});

describe("edge cases", () => {
  it("drops stored entries whose timestamp would make toISOString() throw", () => {
    const raw = JSON.stringify([
      { id: "a", title: "A", body: "", status: "Open", createdAt: 1e20 },
      { id: "b", title: "B", body: "", status: "Open", createdAt: 1710000000000 },
    ]);
    const parsed = parseStoredEntries(raw) ?? [];
    expect(parsed.map((entry) => entry.id)).toEqual(["b"]);
    expect(() => parsed.forEach((entry) => new Date(entry.createdAt).toISOString())).not.toThrow();
  });

  it("drops repeated ids and accepts a leading BOM", () => {
    const raw = `﻿${JSON.stringify([entries[0], entries[0], entries[1]])}`;
    expect(parseStoredEntries(raw)?.map((entry) => entry.id)).toEqual(["1", "2"]);
  });

  it("rejects invisible-only titles and never clips an emoji in half", () => {
    expect(createEntry({ title: "​﻿", body: "", status: "Open" }, "x", 5)).toHaveProperty("error");
    const entry = createEntry({ title: `${"x".repeat(79)}😀`, body: "", status: "Open" }, "x", 5);
    expect(entry).toMatchObject({ title: "x".repeat(79) });
  });

  it("pluralizes the ticket counter", () => {
    expect(ticketCount(1)).toBe("01 TICKET");
    expect(ticketCount(0)).toBe("00 TICKETS");
    expect(ticketCount(12)).toBe("12 TICKETS");
  });
});
