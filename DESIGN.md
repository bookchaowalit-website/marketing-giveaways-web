# Giveaways — design direction

## Product surface

A plain list of giveaway entries kept in this browser: add, search, change status, remove. There is
no draw engine and nothing contacts entrants.

## System (2026-11-19)

The site uses the shared **App shell** (`app/app-shell.css`, `components/app-shell.tsx`, see
`APP-SHELL.md`), copied byte-identical from productivity-ideas-web. One set of colours: the shell's
`--as-*` tokens in light and dark (the old double `--orange` and cobalt/tangerine theme are gone);
`.gw-*` additions in `app/globals.css` reuse them. Typography is Geist via `next/font`.

- Lists: All entries, Open, Draft, Closed with counts; search in the head.
- One filled button: New entry. The composer opens in place, focuses the title, and keeps Add
  disabled until it has text; status is a segmented control.
- Rows: title, how to enter, date, a status select (44px) and status pill (text, not colour alone),
  Remove with Undo.
- Empty states: "No entries yet" (nothing stored), "No Draft entries" (empty list), and
  "Nothing matches" with Clear search. Counts read "1 entry" / "2 entries".
- Footer back to bookchaowalit.com; `/more-projects` redirects there. No analytics scripts.
- Floor: text >= 12px, controls >= 44px, 3px focus ring, 4.5:1 text, 3:1 input edges, no horizontal scroll at 320px.
