# Design direction

## Product world

Giveaways is a raffle ticket window. The orange ticket form, numbered entries, search rack, and stamped statuses make the simple CRUD demo legible as a small back-office counter rather than another generic admin screen.

## Visual system

- Palette: cobalt `#2547c7`, paper `#f4f1e9`, ink `#17171b`, ticket orange `#b64024`, and mint `#b7f0c8`.
- Type: `Bungee` for ticket-window headlines and `DM Mono` for labels, entry numbers, and status copy.
- Composition: one physical ticket as the primary action, followed by a ruled entry rack and search line.
- Motion: only small control and focus transitions; reduced-motion mode disables nonessential movement.

## Interaction and boundary

Users can add, search, and remove local giveaway entries, with open/draft/closed statuses. Entries persist in `localStorage`. The product intentionally has no random draw engine, winner selection, notification, or server-backed campaign flow.

## Responsive behavior

The ticket becomes a full-width first action on mobile. Rack entries collapse into a readable three-column record with the remove action still accessible and no horizontal overflow.
