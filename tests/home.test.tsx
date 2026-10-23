import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

async function renderHomeAt(isoTime: string) {
  vi.resetModules();
  vi.useFakeTimers({ now: new Date(isoTime), toFake: ["Date"] });
  const { default: Home } = await import("@/app/page");
  return renderToString(<Home />);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("home page", () => {
  it("renders the sample ticket, the form and the no-draw-engine notice", async () => {
    const html = await renderHomeAt("2026-10-23T12:00:00Z");
    expect(html).toContain("Make the draw");
    expect(html).toContain("Sticker pack");
    expect(html).toContain("Comment to enter");
    expect(html).toContain("there is no random winner engine behind this counter");
    expect(html).toContain("NO DRAW ENGINE / CRUD DEMO");
  });

  it("server markup does not depend on the clock (no hydration mismatch on the sample ticket)", async () => {
    // The static page is rendered at build time and hydrated later; a seed timestamp
    // taken from Date.now() made the <time> attribute and date differ between the two.
    const atBuild = await renderHomeAt("2026-10-01T08:00:00Z");
    const atVisit = await renderHomeAt("2026-10-23T20:30:00Z");
    expect(atVisit).toBe(atBuild);
  });
});
