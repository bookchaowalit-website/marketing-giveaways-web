"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createEntry, filterEntries, parseStoredEntries, STATUSES, MAX_BODY, MAX_TITLE, ticketCount, type Entry } from "@/lib/entries";

const INITIAL: Entry[] = [{ id: "1", title: "Sticker pack", body: "Comment to enter", status: "Open", createdAt: Date.now() - 86400000 }];

function useStoredEntries(key: string, initial: Entry[]) {
  const [value, setValue] = useState<Entry[]>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => { try { const stored = parseStoredEntries(window.localStorage.getItem(key)); if (stored) setValue(stored); } catch { /* local-only recovery */ } setReady(true); }, 0); return () => window.clearTimeout(timer); }, [key]);
  useEffect(() => { if (!ready) return; try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ } }, [key, value, ready]);
  return [value, setValue] as const;
}

export default function Home() {
  const [entries, setEntries] = useStoredEntries("giveaways-v2", INITIAL);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Entry["status"]>("Open");
  const [notice, setNotice] = useState("The window is ready for a new entry.");
  const filtered = useMemo(() => filterEntries(entries, query), [entries, query]);

  const addEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const entry = createEntry({ title, body, status }, crypto.randomUUID(), Date.now());
    if ("error" in entry) { setNotice(entry.error); return; }
    setEntries((items) => [entry, ...items]);
    setTitle(""); setBody(""); setStatus("Open"); setNotice("Entry printed and filed in this browser.");
  };
  const updateStatus = (id: string, next: Entry["status"]) => {
    setEntries((items) => items.map((item) => item.id === id ? { ...item, status: next } : item));
    setNotice(`Ticket re-stamped as ${next.toLowerCase()}.`);
  };

  return <main className="gw-page">
    <header className="gw-topbar"><Link className="gw-mark" href="/">ENTRY / WINDOW</Link><span>RAFFLE OFFICE · LOCAL FILE</span><span className="gw-count">{ticketCount(entries.length)}</span></header>
    <section className="gw-hero"><div><p className="gw-stamp">SMALL DRAW / SAMPLE REGISTER</p><h1>Make the draw<br /><span>legible.</span></h1><p className="gw-intro">A local list for giveaway entries. Print a clear ticket, search the rack, and keep the demo honest: there is no random winner engine behind this counter.</p></div><div className="gw-ticket"><div className="gw-ticket-head"><span>NEW ENTRY</span><b>NO. {String(entries.length + 1).padStart(3, "0")}</b></div><form className="gw-ticket-form" onSubmit={addEntry}><label>Title<input placeholder="Prize or campaign" required maxLength={MAX_TITLE} value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Details<textarea maxLength={MAX_BODY} placeholder="How someone enters" value={body} onChange={(event) => setBody(event.target.value)} /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as Entry["status"])}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label><button type="submit">PRINT ENTRY <span aria-hidden="true">↗</span></button><p role="status">{notice}</p></form></div></section>
    <section className="gw-rack" aria-labelledby="rack-title"><div className="gw-rule"><span>02 / TICKET RACK</span><span>{filtered.length} MATCHES</span></div><div className="gw-rack-head"><h2 id="rack-title">The entry rack.</h2><label className="gw-search">FIND<input aria-label="Search entries" placeholder="Search title, details, status" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div><div className="gw-list">{filtered.length === 0 ? <p className="gw-empty">No tickets match that search.</p> : filtered.map((entry, index) => <article className="gw-entry" key={entry.id}><span className="gw-entry-number">{String(index + 1).padStart(2, "0")}</span><div className="gw-entry-copy"><div><h3>{entry.title}</h3><label className={`gw-status gw-status-${entry.status.toLowerCase()}`}><span className="sr-only">Status for {entry.title}</span><select value={entry.status} onChange={(event) => updateStatus(entry.id, event.target.value as Entry["status"])}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label></div><p>{entry.body}</p></div><time dateTime={new Date(entry.createdAt).toISOString()}>{new Date(entry.createdAt).toLocaleDateString("en-GB")}</time><button className="gw-delete" type="button" onClick={() => { setEntries((items) => items.filter((item) => item.id !== entry.id)); setNotice("Ticket removed from the local rack."); }} aria-label={`Delete ${entry.title}`}>REMOVE</button></article>)}</div></section>
    <footer className="gw-footer"><strong>NO DRAW ENGINE / CRUD DEMO</strong><span>Giveaways · Bookchaowalit · localStorage only</span></footer>
  </main>;
}
