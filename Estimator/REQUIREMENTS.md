# MindfulSpend Requirements

This file tracks new feature requirements. Each section is removed once fully implemented.

---

## [PENDING] Group Types, Status, Currency & Occasions

### 1. Group Types

Every group gets a `type` field. MVP set (in priority order):

| Type | Key | Has end date? | Can complete? |
|---|---|---|---|
| Household | `household` | No | No (archive only) |
| Roommates | `roommates` | No | Yes (when they move out) |
| Couple | `couple` | No | No (archive only) |
| Travel | `travel` | Yes (`tripEndDate`) | Yes ⭐ |
| Family | `family` | No | No (archive only) |

GroupEditor must show a **type selector** when creating a new group.
Travel type shows an extra **Trip End Date** field.
Each type should have a brief label/description in the UI (e.g. "Shared household bills & budget").

---

### 2. Group Status

Groups gain a `status` field: `active | completed | archived`

**Transitions:**
- `active` → `completed` — user manually marks complete (Travel, Roommates types only in MVP)
- `completed` → `archived` — user hides it
- `completed` → `active` — user reopens it

**Auto-suggest completion for Travel groups:**
- When `tripEndDate` is set and that date has passed, suggest completing the group.
- If no expenses added for 7+ days, also suggest completing.

**On completing a Travel group — show a Trip Summary modal before locking:**
- Trip name, duration (start → end), total spent, per-person average
- Final settlements list (who owes whom, amount)
- Actions: [Share Summary] [Archive] [Reopen]

**GroupCard badge changes by status:**
- `active` → green badge `ACTIVE`
- `completed` → grey badge `COMPLETED` + read-only lock icon
- `archived` → hidden from main list (show via "Show archived" toggle in HubView)

**GroupCard footer stat changes:**
- Active travel group: shows `TOTAL BUDGET ₹X`
- Completed travel group: shows `TOTAL SPENT ₹X`

---

### 3. Currency

Every group gets a `currency` field (default `INR`).

**Supported currencies (MVP):**

| Currency | Code | Symbol |
|---|---|---|
| Indian Rupee | INR | ₹ |
| US Dollar | USD | $ |
| Euro | EUR | € |
| British Pound | GBP | £ |
| UAE Dirham | AED | د.إ |
| Singapore Dollar | SGD | S$ |
| Australian Dollar | AUD | A$ |

GroupEditor shows a **currency dropdown** when creating/editing a group.
All money display across the app (DashboardTab, TrackTab, BudgetTab, AnalysisTab) uses the group's currency symbol instead of a hardcoded `₹`.

---

### 4. Data Model Changes (AppContext + Backend)

Add to the group object:

```js
{
  // existing fields...
  type: 'household' | 'roommates' | 'couple' | 'travel' | 'family',
  status: 'active' | 'completed' | 'archived',
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD' | 'AUD',
  completedAt: null,        // ISO date string when marked complete
  tripEndDate: null,        // ISO date string, travel type only
}
```

Defaults for existing groups (backward compatibility):
- `type` → `'household'`
- `status` → `'active'`
- `currency` → `'INR'`
- `completedAt` → `null`
- `tripEndDate` → `null`

Backend (`group.repository.ts` / `group.service.ts`) must persist and return these new fields.

---

### 5. Occasions (Future — do not build yet, requirements only)

An **Occasion** is a separate entity from a Group. It covers multi-party shared events (weddings, engagements, ceremonies) where two families each have their own sub-budget plus a shared pool.

**Not a Group sub-type** — different data model, different UX. Build after Group Types are stable.

**Occasion data model (sketch):**
```js
{
  id: 'occ_123',
  type: 'occasion',
  occasionType: 'wedding' | 'engagement' | 'birthday' | 'ceremony' | 'housewarming' | 'graduation',
  name: 'Sharma–Verma Wedding',
  date: '2026-12-15',
  status: 'active' | 'completed',
  currency: 'INR',
  parties: [
    {
      id: 'party_bride',
      label: 'bride',          // or 'groom', 'host', 'family', etc.
      name: "Bride's Side",
      members: [...],
      budget: 500000,
    },
    {
      id: 'party_groom',
      label: 'groom',
      name: "Groom's Side",
      members: [...],
      budget: 300000,
    }
  ],
  sharedExpenses: [],   // expenses both parties agreed to split
  totalBudget: 800000,
}
```

**Key UX for Occasions:**
- Each party sees their own expenses + the shared pool
- Shared expense approval flow — one party proposes, other approves
- Side-by-side budget view (Party A spent | Party B spent | Shared)
- Guest count per party for proportional splitting
- Vendor tracker (caterer, photographer, DJ, etc.) with booking + final amounts
- Post-event settlement summary

**Indian occasion types to support:** Wedding (Shaadi), Engagement (Roka/Sagai), Mundan, Baby Shower (Godh Bharai), Housewarming (Griha Pravesh), Birthday (milestone), Graduation.

---

*Once a section above is fully implemented and tested, delete it from this file.*
