# HouseApps — Salary Split Calculator · Codebase Reference

> Last updated: 2026-06-14  
> Purpose: Complete reference for agents and developers working on this codebase.

---

## Overview

A **single-page, zero-dependency household budget app** built in plain HTML/CSS/JS.
No framework, no build step, no server. Open `index.html` in a browser and it runs.

The app has two top-level screens:

| Screen | URL hash | Purpose |
|---|---|---|
| **Group Hub** | `#/hub` | Create / edit / delete household groups |
| **Calculator** | `#/group/:id/:tab` | 5-tab budget calculator for the selected group |

All state is **in-memory only** (no localStorage, no backend). A session refresh resets everything to the seeded default group.

---

## File Structure

```
HouseApps/
├── index.html          # HTML shell only — no logic, no styles inline
├── css/
│   └── main.css        # All styles (~485 lines)
└── js/
    ├── data.js         # Constants, shared state, pure helpers (~210 lines)
    ├── groups.js       # Hash router + Group Hub + Group Editor (~424 lines)
    └── app.js          # Calculator: all 5 tabs, modal, badges (~634 lines)
```

**Script load order in index.html** (order matters — each file depends on the previous):
```html
<script src="js/data.js"></script>
<script src="js/groups.js"></script>
<script src="js/app.js"></script>
<script>
  window.addEventListener('hashchange', router);
  router();  // boot: reads current hash and renders the right screen
</script>
```

---

## Data Model

### Constants (defined in `js/data.js`, never mutated)

#### `MONTHS` — `string[]`
`['Jun','Jul','Aug','Sep','Oct','Nov','Dec']` — 7 months, Jun = index 0.

#### `BUDGET_STRUCTURE` — category tree
```js
[
  { key, label, pct, cls, color,
    subs: [ { key, label, pct }, ... ]
  }, ...
]
```
Three top-level categories:
- `needs` (30%) — 6 sub-categories
- `wants` (18%) — 5 sub-categories
- `savings` (52%) — 5 sub-categories

`pct` values are decimals (0–1). They are the **defaults** — a group can override them via `budgetPcts`.

#### `DETAIL_ITEMS` — `{ [subKey]: [{key, label}] }`
Maps each of the 16 sub-category keys to its list of line items.
Example: `DETAIL_ITEMS['rent'] = [{key:'rent_rent',...}, {key:'rent_elec',...}, ...]`

These are the actual input rows in Track Expenses.

#### `JUNE_ACTUALS` — `{ [itemKey]: number }`
Pre-seeded actual values for June (index 0). Loaded into `actuals` at startup.

---

### Mutable State (defined in `js/data.js`)

| Variable | Type | Description |
|---|---|---|
| `actuals` | `{ [itemKey-monthIdx]: number }` | All expense entries. Key format: `"rent_rent-0"` (item key + hyphen + month index) |
| `billLog` | `BillEntry[]` | Each uploaded bill. See shape below. |
| `changeLog` | `ChangeEntry[]` | Every manual edit and bill upload, newest first. |
| `activeMonth` | `number` | Currently selected month index (0–6). Default: 0 (Jun). |
| `receiptMonthFilter` | `number \| 'all'` | Active filter on Receipts tab. |
| `collapsed` | `{ [catKey]: boolean }` | Which category sections are collapsed in Track Expenses. |
| `groups` | `Group[]` | All household groups in this session. |
| `currentGroup` | `Group \| null` | The group loaded in the calculator. `null` when on the Hub. |
| `editingGroupId` | `string \| null` | ID of the group being edited in the editor. `null` = new group. |
| `editorMembers` | `Member[]` | Working copy of members while editor is open (in `groups.js`). |
| `editorBudgetPcts` | `BudgetPcts` | Working copy of budget %s while editor is open (in `groups.js`). |

---

### Group Object Shape

```js
{
  id: 'grp_default',                // string, unique
  name: 'Swati & Avinash · 2026',   // string
  members: [
    { id: 'p1', name: 'Swati', color: '#7c3aed', salary: 150000, familyDeduction: 50000 },
    { id: 'p2', name: 'Avinash', color: '#0369a1', salary: 180000, familyDeduction: 45000 },
  ],
  splits: {
    // splits[subCatKey][memberId] = contribution % (0–100, integer)
    // All member values in a row MUST sum to 100
    rent:    { p1: 40, p2: 60 },
    grocery: { p1: 50, p2: 50 },
    // ... all 16 sub-category keys
  },
  budgetPcts: {
    // budgetPcts[catKey].pct = fraction of total salary (0–1)
    // budgetPcts[catKey].subs[subKey] = fraction within that category (0–1)
    // catKey .pct values across all 3 cats MUST sum to 1.0
    // subKey .pct values within each cat MUST sum to 1.0
    needs:   { pct: 0.30, subs: { rent: 0.40, grocery: 0.20, ... } },
    wants:   { pct: 0.18, subs: { shopping: 0.20, dining: 0.10, ... } },
    savings: { pct: 0.52, subs: { emfund: 0.25, home: 0.40, ... } },
  }
}
```

A default group `grp_default` is always seeded on load with Swati & Avinash's data and June actuals.

---

### BillEntry / ChangeEntry shapes

```js
// billLog entry
{ ts: Date, fileName: string, amount: number, subCatKey: string,
  subCatLabel: string, monthIdx: number, note: string }

// changeLog entry
{ ts: Date, source: 'manual'|'bill', path: string, month: string,
  monthIdx: number, subCatKey: string, oldVal: number, newVal: number,
  note?: string }
```

---

## Key Helper Functions (`js/data.js`)

| Function | Returns | Description |
|---|---|---|
| `buildDefaultSplits(members)` | `splits` object | Proportional to net income; fixes rounding so each row sums to exactly 100 |
| `buildDefaultBudgetPcts()` | `budgetPcts` object | Mirrors the `BUDGET_STRUCTURE` pct constants |
| `getMemberNet(m)` | `number` | `max(0, salary - familyDeduction)` |
| `getCombined()` | `number` | Sum of all members' net incomes. Falls back to 235000 if no group loaded. |
| `subBudget(cat, sub)` | `number` | `getCombined() × catPct × subPct`. Reads overrides from `currentGroup.budgetPcts` first, falls back to `BUDGET_STRUCTURE` constants. |
| `personSubBudget(member, cat, sub)` | `number` | `subBudget(cat, sub) × splits[sub.key][member.id] / 100` |
| `subActualMonth(sub, mi)` | `number` | Sum of all line-item actuals for a sub-category in a given month |
| `subActualTotal(sub)` | `number` | Sum across all months |
| `catActualMonth(cat, mi)` / `catActualTotal(cat)` | `number` | Category-level aggregates |
| `findSubForKey(subKey)` | `{cat, sub}` | Reverse lookup: sub-category key → parent cat + sub objects |
| `findSubCatKey(itemKey)` | `string` | Reverse lookup: line-item key → sub-category key |
| `monthHasData(mi)` | `boolean` | Whether any actuals exist for a month |
| `fmt(v)` | `string` | `₹` + Indian locale number (e.g. `₹1,23,456`) |
| `fmtDiff(v)` | `string` | `+₹X` / `−₹X` for signed display |
| `flashUpdate(id, newVal)` | — | Sets text + triggers yellow flash CSS animation if value changed |
| `showToast(msg)` | — | Shows bottom-center toast for 3 s |
| `setTxt(id, val)` / `setCell(id, val)` | — | Safe `textContent` setter (no-op if element missing) |

---

## Hash Router (`js/groups.js`)

```
#/hub                → Group Hub
#/group/:id          → Calculator, dashboard tab
#/group/:id/:tab     → Calculator, specific tab (dashboard|track|budget|analysis|receipts)
```

**Functions:**
- `router()` — reads `location.hash`, decides which screen to activate
- `navigate(path)` — sets `location.hash = '#' + path` (triggers `hashchange` → `router`)
- `setTabInUrl(tabName)` — called on tab click; uses `history.replaceState` to update hash without navigation
- `_activateHub()` — shows `#view-hub`, hides `#view-app`, calls `renderGroupHub()`
- `_activateApp(grp, tab)` — sets `currentGroup`, shows `#view-app`, calls `buildAll()` then `showTab(tab)`

---

## Group Hub (`js/groups.js`)

- `renderGroupHub()` — renders group cards into `#group-grid`
- `openGroup(id)` — calls `navigate('/group/id/dashboard')`
- `goToHub()` — calls `navigate('/hub')`
- `deleteGroup(id)` — confirms, removes from `groups[]`, re-renders hub

---

## Group Editor (`js/groups.js`)

Opened inline in `#group-editor` panel (hidden by default).

**Lifecycle:**
1. `startNewGroup()` or `editGroup(id)` — populates editor, shows panel
2. User fills: group name → members → budget allocation % → category splits
3. `saveGroup()` — validates, writes to `groups[]`, closes editor
4. `cancelEditor()` — hides panel, clears working state

**Member editor functions:**
- `renderMemberRows()` — renders `#member-list` from `editorMembers[]`
- `addMemberRow()` / `removeMemberRow(id)` — mutate `editorMembers`, re-render
- `updateMemberNet(i)` — updates the Net display cell live on salary/deduction input
- `syncMemberToSplits()` — re-renders split table headers when member names change

**Budget Allocation % editor:**
- `renderBudgetPctsTable(existing?)` — renders `#budget-pcts-tbody` from `editorBudgetPcts`
  - Category header rows: editable `% of Total` (must sum to 100 across 3 cats)
  - Sub-category rows: editable `% within Cat` (must sum to 100 within each cat)
  - Effective % of salary column = catPct × subPct, computed live
- `onBudgetCatPctInput(catKey)` — updates `editorBudgetPcts[catKey].pct`, refreshes effective % labels
- `onBudgetSubPctInput(catKey, subKey)` — updates `editorBudgetPcts[catKey].subs[subKey]`, refreshes sub-sum indicator
- `updateBudgetCatTotal()` — updates `#bpct-cat-total` ✓/✗ indicator for the 3-category sum
- `readBudgetPctsFromTable()` — reads all inputs → returns `budgetPcts` object
- `resetBudgetPctsToDefault()` — calls `renderBudgetPctsTable(buildDefaultBudgetPcts())`
- `validateBudgetPcts()` — returns `false` + shows toast if any total ≠ 100%

**Category Splits editor:**
- `renderSplitsTable(existingSplits?)` — renders `#splits-tbody` with one input per member per sub-category
  - Input IDs: `sp-{memberId}-{subKey}`
  - Row total IDs: `sptot-{subKey}` — shows ✓ 100% or ✗ N%
- `renderSplitsTableHeaders()` — updates `#splits-thead` with current member names/colors
- `onSplitInput(_memberId, subKey)` — recalculates row total for one sub-category row
- `applyIncomeRatioAll()` — fills all split inputs proportional to net income in one click
- `readSplitsFromTable()` — reads all `sp-*` inputs → returns `splits` object

**Validation in `saveGroup()`:**
1. Group name not empty
2. All member names not empty
3. `validateBudgetPcts()` — category % sum and sub-category % sums
4. All split rows sum to 100%

---

## Calculator (`js/app.js`)

Activated when a group is opened. `buildAll()` constructs all tab DOM once; `refreshAll()` updates values without rebuilding DOM.

### Tab Navigation

- `showTab(name, btn?)` — activates tab panel + nav button, calls `setTabInUrl`, calls `updateBadges()`
- `showTabByName(name)` — alias without button reference
- `navigateToRow(subKey, mi?)` — switches to Track Expenses, sets `activeMonth`, scrolls + flashes target row

### Build/Refresh Pattern

`buildAll()` calls all `build*` functions once per group open.  
`refreshAll()` calls all `refresh*` + `render*` functions whenever any value changes.

| Build function | Refresh function | What it manages |
|---|---|---|
| `buildIncomeCards()` | `refreshIncomeCards()` | Income cards in Budget & Income tab |
| `buildBudgetTab()` | `refreshBudgetTab()` | Budget allocation table |
| `buildTrackTab()` | `refreshTrackTab()` | Expense tracker table + month pills + summary |
| `buildAnalysisTab()` | `refreshAnalysis()` | Budget vs Actual analysis table |
| `buildTemplateAccordion()` | _(static)_ | Category reference accordion |
| `buildReceiptsFilters()` | `renderBills()` | Receipt month pills + category dropdown + bill cards |
| `buildModalCategoryDropdown()` | _(static)_ | Bill upload modal category dropdown |
| — | `refreshDashboard()` | KPI cards, health bars, alerts, recent entries |
| — | `renderLog()` | All Changes list |
| — | `updateBadges()` | Tab nav badge counts |

### DOM ID Conventions

| Pattern | Example | Used for |
|---|---|---|
| `b-cat-{catKey}` | `b-cat-needs` | Category total amount in Budget tab |
| `b-sub-{subKey}` | `b-sub-rent` | Sub-category amount in Budget tab |
| `b-person-{memberId}-{subKey}` | `b-person-p1-rent` | Per-person amount in Budget tab (read-only) |
| `b-sub-pct-{subKey}` | `b-sub-pct-rent` | "% of salary" label in Budget tab |
| `row-{subKey}` | `row-rent` | Sub-category row in Track Expenses (scroll target) |
| `cat-hdr-{catKey}` | `cat-hdr-needs` | Category header row (collapsible) |
| `t-bud-{subKey}` | `t-bud-rent` | Budget amount cell in Track Expenses |
| `t-cat-{subKey}-{mi}` | `t-cat-rent-0` | Monthly actual total cell in Track Expenses |
| `t-total-{subKey}` | `t-total-rent` | All-months total cell |
| `t-excess-{subKey}` | `t-excess-rent` | "X saved / X over" status cell |
| `inp-{itemKey}-{mi}` | `inp-rent_rent-0` | Editable actual input in Track Expenses |
| `i-total-{itemKey}` | `i-total-rent_rent` | Line-item total across all months |
| `an-bud-{subKey}` | `an-bud-rent` | Budget column in Analysis tab |
| `an-{subKey}-{mi}` | `an-rent-0` | Monthly diff cell in Analysis tab |
| `an-bal-{subKey}` | `an-bal-rent` | Balance column in Analysis tab |
| `ath-{mi}` | `ath-0` | Analysis tab month header |
| `th-track-{mi}` | `th-track-0` | Track Expenses month column header |
| `bpct-cat-{catKey}` | `bpct-cat-needs` | Budget pct category input in Group Editor |
| `bpct-sub-{subKey}` | `bpct-sub-rent` | Budget pct sub-category input in Group Editor |
| `bpct-subsum-{catKey}` | `bpct-subsum-needs` | Sub-% sum indicator in Group Editor |
| `sp-{memberId}-{subKey}` | `sp-p1-rent` | Split % input in Group Editor |
| `sptot-{subKey}` | `sptot-rent` | Split row total in Group Editor |

### Key Calculator Functions

**Track Expenses:**
- `setActiveMonth(mi)` — updates `activeMonth`, refreshes pills and tab
- `toggleCatCollapse(key)` — toggles `collapsed[key]`, shows/hides child rows
- `onActualInput(itemKey, mi, val)` — writes to `actuals`, pushes to `changeLog`, calls `refreshAll()`

**Bill Modal:**
- `openModal()` — resets and opens `#modal-overlay`
- `submitBill()` — validates amount, adds to `actuals[firstItem-monthIdx]` (additive), pushes to `billLog` and `changeLog`, calls `refreshAll()` + toast

**Badges:**
- `updateBadges()` — Track: count of months with no data (amber); Analysis: overspent sub-cat count (red); Receipts: bill count (blue)

---

## CSS Architecture (`css/main.css`)

Uses CSS custom properties on `:root`:
```css
--primary, --primary-light, --header-bg
--cat-need, --cat-want, --cat-save      /* category row background colors */
--green, --green-bg, --red, --red-bg, --amber, --amber-bg
--border, --row-alt, --text, --muted, --font
```

Key class groups:
- `.app-header`, `.tab-nav`, `.tab-panel` — shell layout
- `.kpi-card`, `.health-card`, `.income-card` — card components
- `.sbox`, `.summary-row` — summary stat boxes
- `.split-inp`, `.split-total`, `.split-ok`, `.split-warn` — Group Editor split table
- `.flash-update` (yellow), `.flash-over` (red) — CSS keyframe animations on value change
- `.tab-badge`, `.badge-red`, `.badge-blue`, `.badge-amber` — tab nav badges
- `.col-active-month` — active month column highlight in tables
- `.cat-header.collapsed` — collapsed category row indicator (▸/▾)
- `.bill-card`, `.bill-grid` — receipt cards in Receipts tab
- `.log-entry`, `.log-list` — All Changes list
- `.modal-overlay`, `.modal` — bill upload modal
- `.editor-panel`, `.member-row`, `.splits-table` — Group Editor

---

## Data Flow Summary

```
User opens app
  → router() reads #/hub
  → _activateHub() → renderGroupHub()

User clicks "Open" on a group card
  → openGroup(id) → navigate('/group/id/dashboard')
  → router() → _activateApp(grp, 'dashboard')
  → currentGroup = grp
  → buildAll() [builds all tab DOM from currentGroup]
  → refreshAll() [fills all values]
  → showTab('dashboard')

User edits an expense input
  → onActualInput(itemKey, mi, val)
  → actuals[key] = val
  → changeLog.unshift(...)
  → refreshAll()

User uploads a bill
  → submitBill()
  → actuals[firstItem-monthIdx] += amount  (additive)
  → billLog.unshift(...), changeLog.unshift(...)
  → refreshAll()

User edits group budget %s or splits and saves
  → saveGroup()
  → validates budgetPcts sums + split row sums
  → groups[i] = { ...name, members, splits, budgetPcts }
  → cancelEditor() → renderGroupHub()
  → (Next time group is opened, buildAll() uses the new budgetPcts/splits)
```

---

## Known Constraints

- **Session-only state**: everything resets on page refresh. No localStorage, no backend.
- **Actuals are household-level**: expense tracking is not per-person. Only budgets and splits are per-person.
- **Bill upload is additive**: amount adds to the first line item of the chosen sub-category. No file parsing or OCR.
- **`refreshBudgetTab()` uses `BUDGET_STRUCTURE` pcts directly** (not `currentGroup.budgetPcts`) for the pill labels and some column calculations — a minor inconsistency to address if budget pcts editing is wired live into the calculator.
- **`refreshTrackTab()` and `refreshAnalysis()` still use `cat.pct * sub.pct`** directly rather than `subBudget()`. If a group has custom `budgetPcts`, these tabs will show the default percentages, not the group's overrides. This should be fixed to call `subBudget(cat, sub)` consistently.

---

## Intended Future Work (from conversation context)

- Backend integration: file storage, OCR for bill totals, persistent groups
- Per-person expense tracking (currently household-combined only)
- Fix `refreshTrackTab` / `refreshAnalysis` / `refreshBudgetTab` to consistently read from `subBudget()` instead of raw `cat.pct * sub.pct`
