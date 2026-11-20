"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppFoot, AppTop, ListButton, Pill, PlusIcon, type Tone } from "@/components/app-shell";
import { createEntry, filterEntries, isBlankTitle, MAX_BODY, MAX_TITLE, parseStoredEntries, SAMPLE_ENTRIES, STATUSES, type Draft, type Entry, type Status } from "@/lib/entries";
import { useStoredState } from "@/lib/use-stored-state";

type ListFilter = "All" | Status;
// index: where it sat in the stored list when removed. nextShown / prevShown: the rows shown around it, for focus.
type RemovedEntry = { entry: Entry; index: number; nextShown?: string; prevShown?: string };
type RemovedBatch = { removals: RemovedEntry[]; viaKeyboard: boolean };
const removedLabel = (removals: RemovedEntry[]) => (removals.length === 1 ? `Removed “${removals[0].entry.title}”` : `Removed ${removals.length} entries`);
/** Put a removed entry back at its old index, unless it is already there. */
function putBack(list: Entry[], item: Entry, index: number): Entry[] {
  return list.some((other) => other.id === item.id) ? list : [...list.slice(0, index), item, ...list.slice(index)];
}

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
const isSample = (id: string) => SAMPLE_ENTRIES.some((sample) => sample.id === id);
// Sample entries render on the server too, so they use a fixed zone (no hydration mismatch); entries the
// user adds only ever render in the browser and show the day in the browser's own time zone.
const formatDate = (entry: Entry) =>
  new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", ...(isSample(entry.id) ? { timeZone: "UTC" } : {}) });

// The row shows one line of detail (App shell rule); a long one gets Show more to read it in full.
function EntryDetail({ body }: { body: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { if (el.dataset.expanded !== "true") setClipped(el.scrollWidth > el.clientWidth); };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    let live = true;
    fonts?.ready?.then(() => { if (live) measure(); });
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [body]);
  const long = expanded || clipped || body.includes("\n");
  return (
    <>
      <p ref={ref} id={id} className="as-row-detail" data-expanded={expanded ? "true" : undefined}>{body}</p>
      {long ? (
        <button type="button" className="as-plain as-row-more" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </>
  );
}

export default function Home() {
  const [entries, setEntries] = useStoredState(STORAGE_KEY, SAMPLE_ENTRIES, parseStoredEntries);
  const [list, setList] = useState<ListFilter>("All");
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  // Every removal still inside the Undo window: one Undo puts them all back where they were.
  const [removed, setRemovedState] = useState<RemovedBatch | null>(null);
  // The latest batch, so two removals before a re-render still both land in it.
  const removedRef = useRef<RemovedBatch | null>(null);
  const setRemoved = (batch: RemovedBatch | null) => { removedRef.current = batch; setRemovedState(batch); };
  const [toastFocused, setToastFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<string[] | null>(null);
  // After a status change takes a row out of the current list: the rows to focus instead (their status select).
  const focusStatus = useRef<string[] | null>(null);
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
  // When the toast closes after Undo or Escape, focus goes back near the removed row once the list has re-rendered:
  // the first of these rows still shown, else New entry, else the open composer's title, else the search field.
  useEffect(() => {
    const ids = focusNext.current;
    if (removed || !ids) return;
    focusNext.current = null;
    const rows = [...document.querySelectorAll<HTMLElement>(".as-row[data-item]")];
    const row = ids.map((id) => rows.find((entry) => entry.dataset.item === id)).find(Boolean);
    (row?.querySelector<HTMLButtonElement>(".as-danger") ?? newRef.current ?? titleRef.current ?? searchRef.current)?.focus();
  }, [removed, entries]);
  // Once the re-stamped row has left the list: the next row's status select, else the previous one's, else
  // New entry (or the search field while the composer is open).
  useEffect(() => {
    const ids = focusStatus.current;
    if (!ids) return;
    focusStatus.current = null;
    const rows = [...document.querySelectorAll<HTMLElement>(".as-row[data-item]")];
    const row = ids.map((id) => rows.find((entry) => entry.dataset.item === id)).find(Boolean);
    (row?.querySelector<HTMLSelectElement>(".gw-status select") ?? newRef.current ?? searchRef.current)?.focus();
  }, [entries, list]);
  // The Undo toast closes 6 s after the latest removal (each removal restarts it), but never while it holds focus.
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => { removedRef.current = null; setRemovedState(null); }, 6000);
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
    // The row leaves the shown list when the new status fails the list filter or the search (which matches status too).
    const staysShown = (list === "All" || status === list) && filterEntries([{ ...entry, status }], query).length === 1;
    if (!staysShown) {
      const shownAt = visible.findIndex((item) => item.id === entry.id);
      focusStatus.current = [visible[shownAt + 1]?.id, shownAt > 0 ? visible[shownAt - 1].id : undefined].filter((id): id is string => Boolean(id));
    }
    setEntries((current) => current.map((item) => (item.id === entry.id ? { ...item, status } : item)));
    setAnnouncement(`“${entry.title}” is now ${status}.`);
  }

  function remove(entry: Entry, viaKeyboard: boolean) {
    const index = entries.findIndex((item) => item.id === entry.id);
    if (index < 0) return;
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    const shownAt = visible.findIndex((item) => item.id === entry.id);
    const removal: RemovedEntry = { entry, index, nextShown: visible[shownAt + 1]?.id, prevShown: shownAt > 0 ? visible[shownAt - 1].id : undefined };
    const removals = [...(removedRef.current?.removals ?? []), removal];
    setRemoved({ removals, viaKeyboard });
    setAnnouncement(removals.length === 1 ? `Removed “${entry.title}”. Undo is available for a few seconds.` : `Removed ${removals.length} entries. Undo is available for a few seconds.`);
  }

  function closeToast(focusIds?: string[]) {
    const last = removedRef.current?.removals.at(-1);
    // Dismissed: the row after the removed one, else the one before it.
    focusNext.current = focusIds ?? [last?.nextShown, last?.prevShown].filter((id): id is string => Boolean(id));
    setRemoved(null);
    setToastFocused(false);
  }
  function undo() {
    const removals = removedRef.current?.removals;
    if (!removals?.length) return;
    // Latest removal first, so each index refers to the list as it was just before that removal.
    setEntries((current) => removals.reduceRight((list, { entry, index }) => putBack(list, entry, index), current));
    const latest = removals[removals.length - 1].entry;
    setAnnouncement(removals.length === 1 ? `Restored “${latest.title}”.` : `Restored ${removals.length} entries.`);
    // Undone: back to the restored row the user removed last.
    closeToast([latest.id]);
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
                  <button type="submit" className="as-button" disabled={isBlankTitle(draft.title)}>Add</button>
                </div>
              </div>
            </form>
          ) : null}

          {visible.length ? (
            <ul className="as-list" aria-label={title}>
              {visible.map((entry) => (
                <li className="as-row" key={entry.id} data-item={entry.id}>
                  <div>
                    <h3>{entry.title}</h3>
                    <EntryDetail body={entry.body} />
                    <p className="as-row-meta"><time dateTime={new Date(entry.createdAt).toISOString()}>{formatDate(entry)}</time>{isSample(entry.id) ? " · Example entry" : ""}</p>
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
          onKeyDown={(event) => { if (event.key === "Escape") closeToast(); }}
        >
          <span>{removedLabel(removed.removals)}</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={undo} aria-label={removed.removals.length === 1 ? "Undo remove" : `Undo remove of ${removed.removals.length} entries`}>Undo</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/marketing-giveaways-web" />
    </div>
  );
}
