"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppFoot, AppTop, ListButton, Pill, PlusIcon, type Tone } from "@/components/app-shell";
import { createEntry, filterEntries, MAX_BODY, MAX_TITLE, parseStoredEntries, SAMPLE_ENTRIES, STATUSES, type Draft, type Entry, type Status } from "@/lib/entries";
import { useStoredState } from "@/lib/use-stored-state";

type ListFilter = "All" | Status;
type Removed = { entry: Entry; index: number; viaKeyboard: boolean };

const STORAGE_KEY = "giveaways-v2";
const EMPTY: Draft = { title: "", body: "", status: "Open" };
const TONE: Record<Status, Tone> = { Open: "green", Draft: "amber", Closed: "grey" };
const LISTS: ListFilter[] = ["All", ...STATUSES];

// randomUUID only exists in secure contexts (HTTPS/localhost) and newer browsers.
function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const plural = (count: number) => `${count} ${count === 1 ? "entry" : "entries"}`;
const formatDate = (at: number) => new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function Home() {
  const [entries, setEntries] = useStoredState(STORAGE_KEY, SAMPLE_ENTRIES, parseStoredEntries);
  const [list, setList] = useState<ListFilter>("All");
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const [toastFocused, setToastFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const wasComposing = useRef(false);
  const inList = useMemo(() => (list === "All" ? entries : entries.filter((entry) => entry.status === list)), [entries, list]);
  const visible = useMemo(() => filterEntries(inList, query), [inList, query]);
  const countOf = (value: ListFilter) => (value === "All" ? entries.length : entries.filter((entry) => entry.status === value).length);

  // Opening the composer focuses its title; closing it returns focus to New entry.
  useEffect(() => {
    if (composing) titleRef.current?.focus();
    else if (wasComposing.current) newRef.current?.focus();
    wasComposing.current = composing;
  }, [composing]);
  useEffect(() => { if (removed?.viaKeyboard) undoRef.current?.focus(); }, [removed]);
  // The Undo toast closes 6 s after a removal, but never while it holds focus.
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => setRemoved(null), 6000);
    return () => window.clearTimeout(timer);
  }, [removed, toastFocused]);
  // While the toast shows, the page reserves its height so nothing focusable stays hidden under it.
  const toastShown = removed !== null;
  useLayoutEffect(() => {
    const toast = toastRef.current;
    if (!toastShown || !toast) return;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--as-toast-space", `${toast.offsetHeight + 32}px`);
    return () => { rootStyle.removeProperty("--as-toast-space"); };
  }, [toastShown]);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entry = createEntry(draft, createId(), Date.now());
    if ("error" in entry) { setAnnouncement(entry.error); return; }
    setEntries((current) => [entry, ...current]);
    if (list !== "All" && list !== entry.status) setList(entry.status);
    setQuery("");
    setAnnouncement(`Added “${entry.title}” as ${entry.status}.`);
    setDraft(EMPTY);
    setComposing(false);
  }

  function restamp(entry: Entry, status: Status) {
    setEntries((current) => current.map((item) => (item.id === entry.id ? { ...item, status } : item)));
    setAnnouncement(`“${entry.title}” is now ${status}.`);
  }

  function remove(entry: Entry, viaKeyboard: boolean) {
    const index = entries.findIndex((item) => item.id === entry.id);
    if (index < 0) return;
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setRemoved({ entry, index, viaKeyboard });
    setAnnouncement(`Removed “${entry.title}”. Undo is available for a few seconds.`);
  }

  function undo() {
    if (!removed) return;
    const { entry, index } = removed;
    setEntries((current) => (current.some((item) => item.id === entry.id) ? current : [...current.slice(0, index), entry, ...current.slice(index)]));
    setAnnouncement(`Restored “${entry.title}”.`);
    setRemoved(null);
    setToastFocused(false);
  }

  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }

  const title = list === "All" ? "All entries" : list;
  const q = query.trim();

  return (
    <div className="as">
      <a className="as-skip" href="#main">Skip to content</a>
      <AppTop name="Giveaways" tagline="A plain list of giveaway entries" />

      <div className="as-body">
        <aside className="as-side" aria-label="Lists">
          <h2>Lists</h2>
          <ul className="as-lists">
            {LISTS.map((value) => (
              <ListButton key={value} label={value === "All" ? "All entries" : value} count={countOf(value)} tone={value === "All" ? undefined : TONE[value]} current={list === value} onSelect={() => setList(value)} />
            ))}
          </ul>
        </aside>

        <main id="main" className="as-main">
          <div className="as-head">
            <div>
              <h1>{title}</h1>
              <p aria-live="polite">{plural(visible.length)}{q ? ` matching “${q}”` : ""}</p>
            </div>
            <div className="as-tools">
              <label className="as-search">
                <span className="as-sr">Search entries</span>
                <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
              </label>
              {composing ? null : <button ref={newRef} type="button" className="as-button" onClick={() => setComposing(true)}><PlusIcon />New entry</button>}
            </div>
          </div>

          {composing ? (
            <form className="as-composer" onSubmit={add} aria-label="New entry">
              <label className="as-field">Prize or campaign
                <input ref={titleRef} value={draft.title} maxLength={MAX_TITLE} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Sticker pack" autoComplete="off" />
              </label>
              <label className="as-field">How to enter
                <textarea value={draft.body} maxLength={MAX_BODY} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Comment on the post, one entry per person" />
              </label>
              <div className="as-composer-foot">
                <div className="as-segmented-wrap">
                  <span id="status-label">Status</span>
                  <div className="as-segmented" role="group" aria-labelledby="status-label">
                    {STATUSES.map((status) => (
                      <button key={status} type="button" aria-pressed={draft.status === status} onClick={() => setDraft({ ...draft, status })}>{status}</button>
                    ))}
                  </div>
                </div>
                <div className="as-composer-actions">
                  <button type="button" className="as-plain" onClick={() => { setComposing(false); setDraft(EMPTY); }}>Cancel</button>
                  <button type="submit" className="as-button" disabled={!draft.title.trim()}>Add</button>
                </div>
              </div>
            </form>
          ) : null}

          {visible.length ? (
            <ul className="as-list" aria-label={title}>
              {visible.map((entry) => (
                <li className="as-row" key={entry.id}>
                  <div>
                    <h3>{entry.title}</h3>
                    <p className="as-row-detail">{entry.body}</p>
                    <p className="as-row-meta"><time dateTime={new Date(entry.createdAt).toISOString()}>{formatDate(entry.createdAt)}</time>{SAMPLE_ENTRIES.some((sample) => sample.id === entry.id) ? " · Example entry" : ""}</p>
                    <label className="gw-status">Status
                      <select value={entry.status} onChange={(event) => restamp(entry, event.target.value as Status)} aria-label={`Status for ${entry.title}`}>
                        {STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </label>
                  </div>
                  <Pill tone={TONE[entry.status]}>{entry.status}</Pill>
                  <button type="button" className="as-plain as-danger" aria-label={`Remove ${entry.title}`} onClick={(event) => remove(entry, event.detail === 0)}>Remove</button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="as-list as-empty">
              {q ? (
                <>
                  <strong>Nothing matches</strong>
                  No entry in {list === "All" ? "your lists" : title} mentions “{q}”.
                  <div style={{ marginTop: 8 }}><button type="button" className="as-plain" onClick={clearSearch}>Clear search</button></div>
                </>
              ) : entries.length === 0 ? (
                <><strong>No entries yet</strong>Press New entry to add the first giveaway.</>
              ) : (
                <><strong>No {title} entries</strong>Change an entry&apos;s status, or press New entry and pick {title}.</>
              )}
            </div>
          )}

          <p className="as-note">Saved in this browser only. This is a list, not a draw: nothing here picks a winner or contacts anyone.</p>
        </main>
      </div>

      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {removed ? (
        <div
          ref={toastRef}
          className="as-toast"
          role="group"
          aria-label="Undo remove"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") { setRemoved(null); setToastFocused(false); } }}
        >
          <span>Removed “{removed.entry.title}”</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={undo}>Undo</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/marketing-giveaways-web" />
    </div>
  );
}
