---
name: mindfulspend-react
description: Conventions and gotchas for the MindfulSpend React app. Use before editing anything in src/context or src/components — GroupEditor, BillModal, TrackTab, DashboardTab, AnalysisTab, BudgetTab, AppContext. Also use when the user mentions group types, budget percentages, member splits, label overrides, or expense saving issues.
---

# MindfulSpend React App

React 18, CRA, no UI library, CSS custom properties, light theme. Frontend in `Estimator/mindfulspend 3/`, backend in `Estimator/server/` (Express 5 + TS, port 4000).

## Project shape

```
src/
├── index.js / index.css
├── App.jsx                    # Hub ↔ App routing, calls loadGroups() on mount
├── services/api.js            # thin wrapper → localhost:4000/api
└── context/AppContext.jsx     # ALL state + helpers
└── components/
    ├── HubView.jsx            # group list, create/edit/delete
    ├── GroupEditor.jsx        # create/edit: type, members, budget %, splits
    ├── GroupCard.jsx          # card per group — icon/type/status badge
    ├── AppView.jsx            # sidebar + tab switcher + cross-tab nav
    ├── DashboardTab.jsx       # stat cards + category cards (expand subs)
    ├── TrackTab.jsx           # drag-to-reorder cards, per-item inputs
    ├── BudgetTab.jsx          # income cards (type-aware) + budget table
    ├── AnalysisTab.jsx        # 12-month budget vs actual grid
    ├── ReceiptsTab.jsx        # bill grid + changelog
    ├── BillModal.jsx          # add-expense modal
    └── Toast.jsx
```

## Data model (AppContext.jsx)

- `BUDGET_STRUCTURE` — 3 categories: `needs` / `wants` / `savings`, each with `key`, `label`, `pct`, `subs[]`.
- `DETAIL_ITEMS` — default line items per sub-key (e.g. `housing` → Rent, Maintenance, Other).
- `group.type` — `'household' | 'roommates' | 'couple' | 'travel' | 'family' | 'occasion'`
- `group.status` — `'active'` (only value used so far)
- `group.currency` — not yet wired (next requirement)
- `group.tripEndDate` — ISO string, travel type only
- `group.members[].salary` / `.familyDeduction` — Net = `max(0, salary - familyDeduction)`
- `group.budgetPcts[catKey] = { pct, subs: { subKey: pct } }` — fractions 0–1, not 0–100
- `group.splits[subKey][memberId]` — percentage 0–100 (not fraction)
- `actuals` keyed as `` `${itemKey}-${monthIdx}` `` (monthIdx 0–11), flat
- `billLog` / `changeLog` — flat arrays with `monthIdx`, `subCatKey`, `ts` (Date)

## Type-aware helpers (all exported from AppContext.jsx)

| Helper | Purpose |
|---|---|
| `GROUP_TYPES` | Array of `{ key, label, icon, desc }` for all 6 types |
| `buildDefaultBudgetPcts(type)` | Returns type-specific default fractions; hidden subs get `pct: 0`; missing cats fall back to household |
| `getSubLabel(type, subKey, defaultLabel)` | Returns relabelled sub name for travel/roommates/occasion |
| `getDetailItems(type, subKey)` | Returns type-specific line items array (falls back to `DETAIL_ITEMS`) |
| `visibleCats(type)` | Filters `BUDGET_STRUCTURE` — hides `savings` for roommates |
| `visibleSubs(type, cat)` | Filters `cat.subs` — hides `investments` for travel/occasion, hides `emergency`+`investments` for roommates |

### Type-specific behaviour summary

| Type | Hidden cats | Hidden subs | Label overrides | Member cols | Footer label |
|---|---|---|---|---|---|
| household | — | — | — | Gross + Deduction + Net | Combined net |
| roommates | savings | emergency, investments | food→Groceries & Supplies, utilities→Maid & Utilities, shopping→Home Supplies | Name only | member count |
| couple | — | — | — | Gross + Deduction + Net | Combined net |
| travel | — | investments | housing→Accommodation, utilities→Misc/SIM | Name + Contribution | Total pool |
| family | — | — | — | Gross + Deduction + Net | Combined net |
| occasion | — | investments | housing→Venue, utilities→Decor & Setup, entertainment→Photography & Music, dining→Catering, shopping→Gifts & Favours | Name + Contribution | Total pool |

### Where type-awareness is wired

Every tab uses `visibleCats(type)` + `visibleSubs(type, cat)` for rendering and totals. Never iterate `BUDGET_STRUCTURE` directly in render paths — always go through these helpers. `getDetailItems` replaces `DETAIL_ITEMS[sub.key]` in TrackTab and BudgetTab. `getSubLabel` is used in all tabs + BillModal dropdown. BudgetTab hides income cards + emergency fund banner for travel/occasion/roommates.

## Critical conventions

### 1. No `type="number"` on any input
All percentage, salary, amount fields use plain `<input>` (or `type="text"`) with string state. Parse with `parseFloat` only at save time. `type="number"` breaks intermediate typing states.

### 2. Controlled inputs — no `.toFixed()` in `value=`
Keep as raw strings while editing (e.g. `budgetPctStrs`). Only convert to numbers for read-only derived display.

### 3. Floating-point % validation
Always `Math.round(total * 10) / 10` then `Math.round(...) === 100` before comparing sums to 100.

### 4. Offline-first — always fall back to localStorage
Every group CRUD call tries the API, catches failure, and falls back to `localStorage` (key: `mindfulspend_groups`). Apply same pattern to any new persisted feature.

### 5. Keys not labels
All lookups into `budgetPcts`, `splits`, `DETAIL_ITEMS` use stable `key` fields. Labels are display-only and vary by group type.

### 6. Cross-tab navigation
Dashboard/Receipts/Analysis deep-link into TrackTab via `navTarget` → `focusSubKey`/`focusMonthIdx` props → `onFocusHandled` callback in `AppView.jsx`. No router.

### 7. visibleCats/visibleSubs validation scope
GroupEditor validation (`catTotal`, sub-sum check, splits bad-rows check) must use `visibleCats(type)` and `visibleSubs(type, cat)` — not `BUDGET_STRUCTURE` directly — otherwise hidden cats/subs cause false validation failures.

## Common tasks

| Task | Where |
|---|---|
| Add/change group type behaviour | `AppContext.jsx` — `TYPE_BUDGET_DEFAULTS`, `TYPE_LABEL_OVERRIDES`, `TYPE_DETAIL_ITEMS`, `TYPE_HIDDEN_SUBS`, `TYPE_HIDDEN_CATS` |
| Add a budget category or sub | `AppContext.jsx` `BUDGET_STRUCTURE` + `DETAIL_ITEMS` — cascades to all tabs |
| Fix % input not matching typed value | Check `type="number"` or `.toFixed()` in controlled `value=` |
| Group creation not saving | Check `createGroup` / `updateGroupLocal` offline fallback in `AppContext.jsx` |
| Bill not showing after submit | `submitBill` in `AppContext.jsx` — uses `getDetailItems(groupType, subCatKey)[0]` for optimistic actuals update |
| Add new persisted group field | `AppContext.jsx` data model + `GroupEditor.jsx` form + localStorage save/load |

## Next pending requirements (from REQUIREMENTS.md)

- **Currency** — per-group `currency` field, selector in GroupEditor, symbol used app-wide
- **Group Status** — `active | completed | archived`, Complete button for travel/roommates, Trip Summary modal, GroupCard badge + archived toggle
- **Occasions** — separate entity type (not a group), multi-party budget, not yet started
