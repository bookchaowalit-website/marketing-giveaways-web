import { describe, expect, it } from "vitest";
import { createEntry, filterEntries, parseStoredEntries, type Entry } from "./entries";

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
