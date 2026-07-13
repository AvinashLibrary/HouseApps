---
name: mindfulspend-react
description: Conventions and gotchas for working on the MindfulSpend household budgeting React app (groups, members, budget allocation %, expense tracking, bills, analysis). Use this skill whenever the user asks to add, fix, or modify anything in the MindfulSpend project — including GroupEditor, BillModal, TrackTab, DashboardTab, AnalysisTab, BudgetTab, ReceiptsTab, or AppContext. Also use it whenever the user mentions "household groups", "budget allocation percentages", "members splits", or reports that group creation, percentage inputs, or expense saving "isn't working" in this app — these are known failure patterns covered below. Always consult this skill before editing any file under src/context or src/components in this project so the data model and offline-first behavior aren't accidentally broken.
---

# MindfulSpend React App

A household budget tracker (React 18, CRA, no UI library, CSS custom properties, dark theme). This skill captures conventions established while building/fixing it so edits stay consistent and don't reintroduce already-fixed bugs.

## Project shape

```
src/
├── index.js / index.css       # entry + global styles (CSS vars, dark theme)
├── App.jsx                    # routes Hub view ↔ App view, calls loadGroups() on mount
├── services/api.js            # thin wrapper around Express backend (localhost:4000/api)
└── context/AppContext.jsx     # ALL state lives here — see Data Model below
└── components/
    ├── HubView.jsx             # group picker / create / edit / delete
    ├── GroupEditor.jsx         # create/edit group: members, budget %, splits
    ├── AppView.jsx             # sidebar + tab switcher + cross-tab navigation
    ├── Sidebar.jsx             # nav + badge counts (empty months / overspend / bills)
    ├── DashboardTab.jsx        # stat cards, category cards (click to expand subs)
    ├── TrackTab.jsx            # card-based, drag-to-reorder, per-item inputs
    ├── BudgetTab.jsx           # income cards, per-member budget breakdown table
    ├── AnalysisTab.jsx         # all-12-months budget vs actual grid
    ├── ReceiptsTab.jsx         # bill grid + activity changelog
    ├── BillModal.jsx           # add-expense modal
    └── Toast.jsx
```

Before editing, **read the relevant file in full** — don't pattern-match from memory. The structure below documents intent; the files are ground truth.

## Data model (defined in AppContext.jsx)

- `BUDGET_STRUCTURE`: array of categories (`needs`/`wants`/`savings`), each with a `key`, `label`, `pct` (fraction, e.g. `0.5`), and `subs` (sub-categories, same shape).
- `DETAIL_ITEMS`: maps each sub-category `key` to an array of `{ key, label }` line items (e.g. `housing` → Rent, Maintenance, Other). This is the finest granularity expenses are entered at.
- Group members use `salary` and `familyDeduction` fields — **not** `gross`/`deduction`. Net = `max(0, salary - familyDeduction)`.
- `group.budgetPcts[catKey] = { pct, subs: { subKey: pct } }` — fractions (0–1), not percentages (0–100). Convert with `×100` for display, `÷100` for storage.
- `group.splits[subKey][memberId] = percentage` (0–100, not a fraction) — each member's share of that sub-category's budget.
- `actuals` state is keyed as `` `${itemKey}-${monthIdx}` `` (monthIdx is 0–11), flat in context state — not nested per group/month.
- `billLog` / `changeLog` are flat arrays of objects with `monthIdx`, `subCatKey`, `ts` (Date), etc. — not the old `expenses`/`log` shape from an earlier version of this app.

When adding a new field or tab, follow this shape. Don't invent parallel structures (e.g. don't add a second "expenses" array — extend `actuals`/`billLog`/`changeLog`).

## Critical conventions (each one fixes a real bug — don't regress them)

### 1. Never use `type="number"` on percentage, currency, or amount inputs
HTML number inputs block/mangle intermediate typing states (leading zeros, partial decimals like `7.`, scroll-wheel increments) which makes editing feel broken even when the underlying logic is correct. **Every** percentage field (category %, sub-category %, member split %), salary/deduction field, and bill amount field in this app uses a **plain `<input>` with string state** (no `type` attribute, or `type="text"`). Validation/parsing happens with `parseFloat` only at save time or for derived display values — never by relying on the browser's number-input semantics. If you add a new numeric-looking input anywhere in this project, follow this pattern, not `type="number"`.

### 2. Controlled inputs must not round-trip through formatting on every keystroke
Don't do `value={someNumber.toFixed(1)}` on an input the user is actively typing into — every re-render reformats what they typed and the displayed value drifts from what they entered. Keep percentage/amount fields as raw strings in state (e.g. `budgetPctStrs`) while editing, and only convert to numbers/fractions at the boundary (on save, or for *read-only* derived display like "effective % of salary").

### 3. Floating-point drift in percentage-sum validation
Category % and sub-category % sums are compared to 100 to validate the budget allocation. Always round before comparing (`Math.round(total * 10) / 10` then `Math.round(...) === 100`), since chained fraction math (`0.1 + 0.2`-style errors) can produce `99.999999999` and incorrectly fail validation on a value the user already typed as exactly 100.

### 4. Groups must work without the backend (offline-first)
`services/api.js` talks to an Express server at `http://localhost:4000/api` that usually isn't running in this environment. **Every** group CRUD operation (`createGroup`, `updateGroupLocal`, `deleteGroup`) and data load (`loadGroups`, `loadGroupData`) must try the API call, and on failure **transparently fall back to `localStorage`** (key: `mindfulspend_groups`) rather than surfacing a blocking error or silently failing to save. This was the root cause of "group creation doesn't work" — the API call was throwing and the editor's catch block discarded the group instead of falling back. When adding any new persisted feature (new tab, new field), apply the same try-API/catch-to-localStorage pattern; don't assume the backend is reachable.

### 5. Group editor percent/split tables are keyed by `cat.key`/`sub.key`, never by label
Labels are for display only. All lookups into `budgetPcts`, `splits`, and `DETAIL_ITEMS` use the stable `key` fields from `BUDGET_STRUCTURE`. If you add a new category or sub-category, give it a unique `key` and update `DETAIL_ITEMS` if it needs line items.

### 6. Cross-tab navigation pattern
Dashboard/Receipts/Analysis can deep-link into a specific row on the Track tab (e.g. "View in Expenses" on a bill, or clicking a category sub-row). This is implemented in `AppView.jsx` via a `navTarget` state object passed down as `focusSubKey`/`focusMonthIdx` props to `TrackTab`, which expands the right card and scrolls to it, then calls `onFocusHandled` to clear the target. Reuse this pattern rather than adding new routing/URL-based navigation — there's no router in this app.

## Common requests and where they live

| Request | File(s) to touch |
|---|---|
| Add/rename a budget category or sub-category | `AppContext.jsx` (`BUDGET_STRUCTURE`, `DETAIL_ITEMS`) — cascades automatically to GroupEditor, BudgetTab, TrackTab, AnalysisTab, BillModal since they all derive from this |
| Fix a percentage input that "doesn't match" what was typed | Check for `type="number"` or `.toFixed()` inside a controlled `value=` — see conventions #1–2 |
| Group creation/edit "doesn't work" | Check `AppContext.jsx` `createGroup`/`updateGroupLocal` for offline fallback (#4) before assuming it's a UI bug |
| Add a new stat/chart to Dashboard | `DashboardTab.jsx` — use `getTotalNet`, `getSubBudget`, `getCatActualMonth`, `getSubActualMonth` from context rather than recomputing |
| Add a new persisted field on a member or group | Update `AppContext.jsx` data model section above, plus `GroupEditor.jsx` form, plus localStorage save/load logic |
| Bill/expense not showing up after submit | `submitBill` in `AppContext.jsx` — it optimistically updates `actuals` for the sub-category's *first* `DETAIL_ITEMS` entry, then logs to `billLog`/`changeLog`. If a sub-category's first item isn't the intended target, this is the place to adjust |

## Feature roadmap (prioritized, all independently releasable)

Each row is shippable on its own — dependencies just mean "build this first if both are requested," not "blocked until the other exists." When a request maps to one of these, check the **Depends On** column before starting: if the dependency isn't in the app yet and the user wants both, build the dependency first (or flag the ordering to the user).

| # | Feature | Main files | Depends on |
|---|---|---|---|
| 1 | Currency support | `AppContext.jsx`, `GroupEditor.jsx`, all tabs | None |
| 2 | Group status (active/completed/archived) | `GroupEditor.jsx`, `GroupCard.jsx`, `HubView.jsx` | None |
| 3 | Recurring expenses | `AppContext.jsx`, `TrackTab.jsx`, `BillModal.jsx` | Currency |
| 4 | Payment modes | `BillModal.jsx`, `ReceiptsTab.jsx`, `AnalysisTab.jsx` | None |
| 5 | Merchant support | `BillModal.jsx`, `ReceiptsTab.jsx`, `DashboardTab.jsx` | Payment modes (optional) |
| 6 | Global search & filters | new `Search` component, all tabs | Merchant support |
| 7 | Tags | `BillModal.jsx`, Search, `AnalysisTab.jsx` | Global search |
| 8 | Budget alerts & notifications | `DashboardTab.jsx`, `BudgetTab.jsx` | Existing budget data |
| 9 | Smart dashboard insights | `DashboardTab.jsx` | Budget alerts |
| 10 | Calendar & timeline view | new component | Existing expense data |
| 11 | Import/export (CSV, Excel, PDF) | new service layer | Existing data model |
| 12 | Receipt OCR | `ReceiptsTab.jsx`, `BillModal.jsx` | Merchant support + categories |
| 13 | Goals & savings tracking | `DashboardTab.jsx`, `BudgetTab.jsx` | Currency |
| 14 | AI expense entry (natural language) | new AI service, `BillModal.jsx` | Merchant support + categories |
| 15 | Predictive budgeting & AI insights | `DashboardTab.jsx`, `AnalysisTab.jsx` | Goals & savings + AI expense entry |

Notes for implementation, given the conventions above:
- **Currency (#1)**: add `group.currency` to the data model, a selector in `GroupEditor.jsx`, and thread the symbol through every tab that renders an amount — don't hardcode `$` anywhere. Since amount inputs already follow convention #1 (string state, no `type="number"`), currency symbol should be a display-only prefix/suffix, not baked into the input value.
- **Group status (#2)**: extend `group.status` beyond the current sole value `'active'` to `'active' | 'completed' | 'archived'`. Needs a "Complete" action (relevant especially for `travel`/`roommates` types, which already have end-of-life semantics like `tripEndDate`), a status badge on `GroupCard.jsx`, and an archived-groups toggle in `HubView.jsx`.
- **Recurring expenses (#3)**: builds on `submitBill`/`billLog` in `AppContext.jsx` — add a recurrence rule to a bill and a generator that materializes future `actuals`/`billLog` entries. Do this after currency since recurring amounts should already be currency-aware.
- **Payment modes / Merchant (#4–5)**: both are new fields on the bill object created in `BillModal.jsx` — extend the same object `submitBill` already builds, and surface them in `ReceiptsTab.jsx`'s grid/changelog rather than creating a parallel log.
- **Search/Tags (#6–7)**: keep filtering keyed by stable `key` fields per convention #5, not by display labels (which vary by group type via `getSubLabel`).
- Later items (#8–15) mostly read existing state rather than changing the data model — implement them as new derived views/components rather than adding new top-level state where an existing helper (`getTotalNet`, `getSubBudget`, `getCatActualMonth`, `getSubActualMonth`) already covers it.

## Build/verify checklist before handing back changes

1. `npm install --no-audit --no-fund` (re-run if `node_modules` was stripped for packaging)
2. `CI=true npx react-scripts build` — must say "Compiled successfully." Watch for `eslint-disable-next-line react-hooks/exhaustive-deps` — this project does **not** have `eslint-plugin-react-hooks` installed, so that directive errors out as "rule not found." Use a bare `// eslint-disable-line` instead (no rule name) if you need to silence a hook-deps warning.
3. Strip `node_modules`/`build` before zipping for delivery; re-add only what's needed for the user to `npm install` themselves.
4. When delivering only a partial fix, still rebuild the whole project to catch cross-file regressions, but you can present just the changed file(s) plus the refreshed zip — no need to re-present every unchanged file.