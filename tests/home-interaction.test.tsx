// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
const button = (text: string, scope: ParentNode = host) => [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement;
const rows = () => [...host.querySelectorAll(".as-row h3")].map((h) => h.textContent);
const press = (el: Element, detail = 1) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function pick(el: HTMLSelectElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Home />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("composer", () => {
  it("opens focused, needs a title, adds on top in the chosen list and returns focus", () => {
    press(button("Draft", $(".as-side")!));
    press(button("New entry"));
    expect(document.activeElement).toBe($(".as-composer input"));
    expect(button("Add", $(".as-composer")!).disabled).toBe(true);
    type($<HTMLInputElement>(".as-composer input")!, "Mug");
    type($<HTMLTextAreaElement>(".as-composer textarea")!, "Share the post");
    press(button("Closed", $(".as-composer")!));
    act(() => { $<HTMLFormElement>(".as-composer")!.requestSubmit(); });
    expect($("h1")!.textContent).toBe("Closed");
    expect(rows()).toEqual(["Mug"]);
    expect(document.activeElement?.textContent).toContain("New entry");
    expect(JSON.parse(localStorage.getItem("giveaways-v2")!)[0]).toMatchObject({ title: "Mug", status: "Closed" });
  });

  it("a blank title is refused with a message; Cancel clears the draft", () => {
    press(button("New entry"));
    type($<HTMLInputElement>(".as-composer input")!, "   ");
    act(() => { $<HTMLFormElement>(".as-composer")!.requestSubmit(); });
    expect($('[role="status"]')!.textContent).toContain("needs a title");
    press(button("Cancel"));
    expect($(".as-composer")).toBeNull();
  });
});

describe("lists, search, status and remove", () => {
  it("re-stamps an entry's status and moves it between lists", () => {
    pick($<HTMLSelectElement>(".gw-status select")!, "Draft");
    expect($(".as-pill")!.textContent).toBe("Draft");
    press(button("Open", $(".as-side")!));
    expect($(".as-empty")!.textContent).toContain("No Open entries");
  });

  it("search has its own empty state with Clear search", () => {
    type($<HTMLInputElement>(".as-search input")!, "zzz");
    expect($(".as-empty")!.textContent).toContain("Nothing matches");
    press(button("Clear search"));
    expect(rows()).toEqual(["Sticker pack"]);
    expect(document.activeElement).toBe($(".as-search input"));
  });

  it("Remove offers Undo; the empty rack says what to do next; the toast closes on its own and on Escape", () => {
    vi.useFakeTimers();
    press(button("Remove"), 0);
    expect($(".as-empty")!.textContent).toContain("No entries yet");
    expect(document.activeElement?.textContent).toBe("Undo");
    press(button("Undo"));
    expect(rows()).toEqual(["Sticker pack"]);
    press(button("Remove"));
    act(() => { vi.advanceTimersByTime(6100); });
    expect($(".as-toast")).toBeNull();
    act(() => { vi.useRealTimers(); });
  });

  it("Escape closes the toast", () => {
    press(button("Remove"), 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect($(".as-toast")).toBeNull();
  });
});

describe("batch Undo", () => {
  // Two more entries, so there are at least three rows to remove from.
  beforeEach(() => {
    for (const name of ["Mug", "Tote"]) {
      press(button("New entry"));
      type($<HTMLInputElement>(".as-composer input")!, name);
      act(() => { $<HTMLFormElement>(".as-composer")!.requestSubmit(); });
    }
  });
  // detail 0 = keyboard (Enter/Space) click, 1 = pointer click.
  const click = (el: Element, detail: number) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
  const shownRows = () => [...host.querySelectorAll<HTMLElement>(".as-row[data-item]")];
  const rowIds = () => shownRows().map((row) => row.dataset.item);
  const removeButton = (i: number) => shownRows()[i].querySelector<HTMLButtonElement>(".as-danger")!;
  const undoButton = () => host.querySelector<HTMLButtonElement>(".as-toast button")!;
  const escape = () => act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });

  it("consecutive removes restore together with one Undo", () => {
    vi.useFakeTimers();
    const before = rowIds();
    expect(before.length).toBeGreaterThanOrEqual(3);
    click(removeButton(1), 1);
    act(() => { vi.advanceTimersByTime(4000); });
    click(removeButton(0), 1);
    expect(rowIds()).toEqual(before.slice(2));
    expect($(".as-toast span")!.textContent).toBe("Removed 2 entries");
    expect(undoButton().getAttribute("aria-label")).toBe("Undo remove of 2 entries");
    // The second removal restarted the 6 s window: 4 s later it is still open.
    act(() => { vi.advanceTimersByTime(4000); });
    click(undoButton(), 1);
    expect(rowIds()).toEqual(before);
    expect($(".as-toast")).toBeNull();
    expect($(".as-sr[role=status]")!.textContent).toBe("Restored 2 entries.");
  });

  it("keyboard remove focuses Undo; Undo focuses the restored row, Escape the next one", () => {
    const before = rowIds();
    click(removeButton(0), 0);
    expect(document.activeElement).toBe(undoButton());
    expect(document.documentElement.style.getPropertyValue("--as-toast-space")).toMatch(/px$/);
    click(undoButton(), 0);
    expect(rowIds()).toEqual(before);
    expect(document.activeElement).toBe(removeButton(0));
    click(removeButton(0), 0);
    escape();
    expect($(".as-toast")).toBeNull();
    expect(document.activeElement).toBe(removeButton(0));
    expect(rowIds()).toEqual(before.slice(1));
  });
});

describe("2026-11-20 review", () => {
  const addEntry = (name: string, body = "") => {
    press(button("New entry"));
    type($<HTMLInputElement>(".as-composer input")!, name);
    if (body) type($<HTMLTextAreaElement>(".as-composer textarea")!, body);
    act(() => { $<HTMLFormElement>(".as-composer")!.requestSubmit(); });
  };
  const selectFor = (name: string) => $<HTMLSelectElement>(`select[aria-label="Status for ${name}"]`)!;

  it("a long How to enter note gets Show more to read it in full", () => {
    addEntry("Mug", "Follow the account\nComment with a friend\nShare to your story");
    const more = button("Show more");
    expect(more.getAttribute("aria-expanded")).toBe("false");
    press(more);
    expect(button("Show less").getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(button("Show less").getAttribute("aria-controls")!)!.dataset.expanded).toBe("true");
  });

  it("a status change that takes the row out of the list moves focus to the next row's status, then to New entry", () => {
    addEntry("Mug");
    press(button("Open", $(".as-side")!));
    expect(rows()).toEqual(["Mug", "Sticker pack"]);
    selectFor("Mug").focus();
    pick(selectFor("Mug"), "Draft");
    expect(rows()).toEqual(["Sticker pack"]);
    expect(document.activeElement).toBe(selectFor("Sticker pack"));
    pick(selectFor("Sticker pack"), "Closed");
    expect(document.activeElement?.textContent).toContain("New entry");
  });

  it("shows a user entry's day in the browser's time zone", () => {
    const tz = process.env.TZ;
    process.env.TZ = "Asia/Bangkok";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T17:30:00Z")); // 20 Nov 00:30 in Bangkok
    try {
      addEntry("Mug");
      expect(host.querySelector(".as-row[data-item] time")!.textContent).toBe("20 Nov 2026");
    } finally {
      vi.useRealTimers();
      process.env.TZ = tz;
    }
  });

  it("keeps Add disabled for a title made only of invisible characters", () => {
    press(button("New entry"));
    type($<HTMLInputElement>(".as-composer input")!, "​​");
    expect(button("Add", $(".as-composer")!).disabled).toBe(true);
  });

  it("Escape on Undo with no rows left and the composer open focuses the composer title", () => {
    press(button("New entry"));
    removeOnly();
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.activeElement).toBe($(".as-composer input"));
  });
  const removeOnly = () => act(() => { host.querySelector(".as-danger")!.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 })); });
});
