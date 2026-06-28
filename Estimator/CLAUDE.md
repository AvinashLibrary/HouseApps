# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Two Parts

```
Estimator/
├── UI/      — plain HTML/CSS/JS frontend (no build step, open index.html in browser)
└── server/  — Express 5 + TypeScript REST API
```

They are currently independent. The UI still runs entirely in-memory; the server is the planned persistence backend and is not yet wired into the UI.

---

## UI

No build step. Open `UI/index.html` directly in a browser (Live Server on port 5500 works).

**Full architecture reference:** [UI/CODEBASE.md](UI/CODEBASE.md) — contains the complete data model, DOM ID conventions, function map, and known bugs. Load this file before making any UI edits.

Script load order matters (`data.js` → `groups.js` → `app.js`). All state is global; every file reads from the previous.

**Known bugs to be aware of (from CODEBASE.md):**
- `refreshTrackTab()` and `refreshAnalysis()` use `cat.pct * sub.pct` directly instead of `subBudget()`, so groups with custom `budgetPcts` show default percentages on those tabs.
- `refreshBudgetTab()` uses `BUDGET_STRUCTURE` pcts directly for pill labels — same inconsistency.

---

## Server

```bash
cd server
npm install           # first time only
npm run start         # tsc + node dist/index.js
npm run tsc           # compile only, no run
```

Runs on **port 4000**. Swagger UI at `http://localhost:4000/docs` (reads `swagger.yaml` at startup).

CORS is locked to `ALLOWED_ORIGIN` (default: `http://127.0.0.1:5500` — Live Server). Override with the env var if using a different port.

### Storage

`JsonStore` writes one JSON file per key under `./data/` (configurable via `DATA_DIR` env var):

| Key pattern | Contents |
|---|---|
| `groups` | `Group[]` — all groups |
| `actuals/{groupId}/{year}` | `YearActuals` — `{ "5": { "rent_rent": 22500, ... } }` |
| `bills/{groupId}` | `BillEntry[]` |
| `logs/{groupId}` | `ChangeEntry[]` |

No database. All reads load the whole file; writes overwrite it. Groups are stored as a single array, so every `GroupRepository` write re-saves the full list.

### Feature Layering

Every feature under `src/features/` follows the same three-file pattern:

```
feature.repository.ts  →  reads/writes JsonStore (pure I/O, no logic)
feature.service.ts     →  business logic, orchestrates repositories
feature.routes.ts      →  Express router: validate body → call service → return ok()/err()
```

Dependency injection is done manually in `src/index.ts` — no framework. Services receive repository instances via constructor.

### Types and Validation

`src/types/constant_type.ts` is the **single source of truth** for all types and Zod schemas. Pattern: define a Zod schema, export `z.infer<typeof Schema>` as the TypeScript type — no separate interface + schema.

The `validate<P>` middleware (in `src/middleware/validateBody.ts`) runs Zod `safeParse` on `req.body`, replaces it with the parsed/coerced value on success, or returns `400` with joined issue messages on failure.

All responses use `{ success, data, error }` from `src/core/response.ts` — `ok(data)` or `err(e)`.

### Analysis Endpoint Design

`POST /api/groups/:groupId/analysis` is the only POST-to-read endpoint. The client sends the full `categories` array (with `pct` values) in the request body because category structure lives in the frontend config, not the database. The server joins this against stored actuals and returns budget-vs-actual totals. `AnalysisService` has no repository of its own.

### Bill Submission Side Effects

`POST /api/groups/:groupId/bills` does three writes atomically (no transaction — if one fails, state is partially updated):
1. Appends to `bills/{groupId}`
2. **Adds** the bill amount to the existing actual for that sub-category + month (additive, not replace)
3. Appends a `source: 'bill'` entry to `logs/{groupId}`

`POST /api/groups/:groupId/actuals` similarly logs a `source: 'manual'` change entry for every value that differs from the previously stored value.
