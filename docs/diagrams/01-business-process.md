# 01 — Business process (As-Is / To-Be)

giveaways คือรายการ "ticket" ของ giveaway ที่เก็บใน `localStorage` ของ browser (เพิ่ม, ค้นหา, เปลี่ยนสถานะ Open/Draft/Closed, ลบ) เป็นเดโม CRUD สำหรับผู้เยี่ยมชม portfolio ไม่มีการรับ entry จากผู้เข้าร่วม ไม่สุ่มผู้ชนะ และไม่มีหน้าผลลัพธ์

Last reviewed: 2026-11-28 · commit `381584d`

## As-Is (จากโค้ดวันนี้)

```mermaid
flowchart LR
  V["Visitor opens the site"] --> RD{"read localStorage and parse"}
  RD -->|"array with unknown status, bad date or duplicate id"| DROP["bad entries dropped, may leave an empty rack"]
  RD -->|"nothing saved, unreadable JSON or not an array"| SEED["1 sample ticket"]
  DROP --> LIST["ticket rack"]
  RD -->|"valid"| LIST
  SEED --> LIST
  LIST --> ACT["search, re-stamp status, remove, add"]
  ACT -->|"blank or invisible title"| REF["Add button disabled; submit still refused with: needs a title"]
  ACT -->|"add ok: title clip 80, details clip 400, blank details = No details"| SAVE["write entries to localStorage"]
  ACT -->|"re-stamp"| SAVE
  ACT -->|"remove: saved at once"| SAVE
  SAVE -.->|"after remove"| UNDO["Undo toast: one press restores every ticket removed meanwhile, saves again"]
  AG["Caller POST /api/mcp"] --> MCP["JSON-RPC: one tool get_app_info, static descriptor"]
  MCP -->|"unknown tool or method with an id, bad JSON"| ERR["JSON-RPC error"]
  MCP -->|"notification without id, e.g. notifications/initialized"| ACK["HTTP 202, no body"]
  ERRS["Browser or server error"] --> SEN["Sentry, errors only, only when NEXT_PUBLIC_SENTRY_DSN is set"]
  DEV["Push to main"] --> CI["CI: shared ci-node + security workflows"]
  OWN["Owner runs Vercel CLI deploy; Git link names the old repo, so a push does not deploy [ต้องยืนยัน: state from PRODUCT.md]"] --> LIVE["Live site, can lag main"]
```

Sources: `lib/entries.ts`, `lib/mcp.ts`, `app/api/mcp/route.ts`, `lib/site.ts`, `lib/sentry.ts`, `next.config.ts`, `.github/workflows/ci.yml`, `README.md`, `PRODUCT.md`

ข้อเท็จจริงจากโค้ด: `/more-projects` เป็น 308 ไป `https://bookchaowalit.com/` (README ยังบรรยายว่าเป็นหน้าแยก ซึ่งไม่ตรงกับ `next.config.ts`)

## To-Be (docs/UPGRADE-PLAN.md §Backlog, PRODUCT.md §Live URL and deploy state)

```mermaid
flowchart LR
  V["Visitor opens the site"] --> RD{"read localStorage and parse"}
  RD --> LIST["ticket rack"]
  LIST --> ACT["search, re-stamp status, remove, add"]
  ACT --> SAVE["write entries to localStorage"]
  LIST --> EXP["Export the current rack as JSON"]
  V --> IMP["Import a JSON file at once, e.g. after a browser reset"] --> SAVE
  DEV["Push to main"] --> CI["CI: shared ci-node + security workflows + Playwright smoke test"]
  DEV --> VG["Vercel Git deploy on push to main"] --> LIVE["Live site"]
```

Sources: `docs/UPGRADE-PLAN.md`, `PRODUCT.md`

## Gap

| ID | As-Is → To-Be | Status | Owner | Evidence |
|---|---|---|---|---|
| G1 | Vercel deploy ด้วย CLI เท่านั้น (Git link ชี้ repo เก่า) ทำให้ push ไป main ไม่ deploy และ live ช้ากว่า main → Vercel Git deploy ทุกครั้งที่ push ไป main | blocked | owner | `PRODUCT.md` §Live URL and deploy state (owner action D9) |
| G2 | ไม่มี export/import ทำให้ ticket หายเมื่อ reset browser → export/import rack เป็น JSON (P2) | todo | claude | `docs/UPGRADE-PLAN.md` §Backlog |
| G3 | ไม่มี Playwright smoke test (add, search, re-stamp, remove) ใน CI → เพิ่ม smoke test เมื่อมี browser runner (P1) | todo | claude | `docs/UPGRADE-PLAN.md` §Backlog |
| G4 | ไม่มี To-Be ของกระบวนการแอปนอกเหนือ backlog (เช่น รับ entry จริง หรือสุ่มผู้ชนะ) → owner กำหนดหรือยืนยันว่าคงเป็นเดโม | decide | owner | `PRODUCT.md` §What does not work |

## Open questions

- P2 backlog เรื่อง self-host ฟอนต์ใน `docs/UPGRADE-PLAN.md` ไม่กระทบกระบวนการ จึงไม่ใส่เป็น gap
- สถานะ deploy ตรวจจาก `PRODUCT.md` (2026-10-23) ไม่ได้ตรวจกับ Vercel [ต้องยืนยัน]
