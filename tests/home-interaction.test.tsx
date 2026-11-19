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
