# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

Two independent applications, no shared code or build system:

```
HouseApps/
├── Estimator/
│   ├── UI/          — plain HTML/CSS/JS frontend (no build step)
│   └── server/      — Express 5 + TypeScript backend (in-progress integration)
└── shareTracker/    — standalone stock P&L calculator (single HTML file)
```

---

## Estimator / UI

**No build step.** Open `Estimator/UI/index.html` directly in a browser.

Script load order is significant — `index.html` loads them in this order: `data.js` → `groups.js` → `app.js`. All state is global; functions defined in earlier files are available to later ones.

Full architecture reference (data model, DOM ID conventions, function map, known bugs): [Estimator/UI/CODEBASE.md](Estimator/UI/CODEBASE.md). Load this before editing any UI file.

**Key constraints:**
- State is in-memory only — no localStorage, no persistence across page refreshes.
- `refreshTrackTab()` and `refreshAnalysis()` read `cat.pct * sub.pct` directly instead of calling `subBudget()`, so groups with custom `budgetPcts` will see default percentages on those tabs. Fix: replace with `subBudget(cat, sub)`.
- Bill upload is additive and goes to the first line item of the chosen sub-category — no file parsing.

---

## Estimator / Server

```bash
cd Estimator/server
npm install          # first time
npm run start        # compile TypeScript then run (dist/index.js)
npm run tsc          # compile only
```

Server runs on **port 4000**. Swagger UI: `http://localhost:4000/docs`.

**Storage:** flat JSON files under `server/data/` via `JsonStore` — no database. Each feature has its own read/write key.

**Architecture:** feature-based with strict layering per feature:
- `.repository.ts` — reads/writes `JsonStore`
- `.service.ts` — business logic, orchestrates repositories
- `.routes.ts` — Express router, calls service, uses `validateBody` middleware (Zod schemas)

All responses use the `{ success, data, error }` envelope from `src/core/response.ts`.

Features: `group`, `actuals`, `bills`, `logs`, `analysis`. The `AnalysisService` is read-only (no repository); it joins actuals with category config POSTed by the client, because category structure lives in the frontend.

---

## shareTracker

**No build step.** Open `shareTracker/SAP_PNL_CALCULATER.html` directly in a browser. Depends on SheetJS loaded from CDN.

Full function map, global state, DOM IDs, and known open bugs: [shareTracker/pl-calculator-SKILL.md](shareTracker/pl-calculator-SKILL.md). Load this before editing any shareTracker file.

**Open bugs (from skill file):** filter tabs always hidden (Bug #1), `#realised-section` never populated (Bug #2), `goBack()` doesn't clear state (Bug #3), `parseDate()` locale-ambiguous (Bug #4), dividend qty×price silent zero (Bug #5), `renderHoldingsTable` rebuilds on every keystroke — needs debounce (Perf).
