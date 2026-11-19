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

describe("home page on the App shell", () => {
  it("renders the example entry with its pill, the lists with counts and the no-draw notice", async () => {
    const html = await renderHomeAt("2026-10-23T12:00:00Z");
    expect(html).toContain('class="as"');
    expect(html).toContain("Sticker pack");
    expect(html).toContain("Comment to enter");
    expect(html).toContain("Example entry");
    expect(html).toMatch(/data-tone="green"[^>]*>Open</);
    expect(html).toMatch(/aria-current="true"[^>]*><span>All entries<\/span><span class="as-count">1<\/span>/);
    expect(html).toContain("1 entry");
    expect(html).toContain("This is a list, not a draw");
    expect(html.match(/class="as-button"/g)).toHaveLength(1);
    expect(html).not.toMatch(/ENTRY \/ WINDOW|MATCHES/);
  });

  it("server markup does not depend on the clock (no hydration mismatch on the sample entry)", async () => {
    const atBuild = await renderHomeAt("2026-10-01T08:00:00Z");
    const atVisit = await renderHomeAt("2026-10-23T20:30:00Z");
    expect(atVisit).toBe(atBuild);
  });
});
