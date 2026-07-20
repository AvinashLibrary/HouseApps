# PRD: Budget-Aware Place Recommendations for Travel Groups

**Status:** Draft — for review
**Owner:** TBD
**Related roadmap items:** New (not previously numbered); depends on the `travel` group type, existing budget/actuals model, and group member/contributor structure

---

## 1. Problem Statement

Travel groups in MindfulSpend already track a budget pool and spend against categories (dining, entertainment, transport, etc.), but the app is purely reactive — it tells you what you *have* spent, not what you *could do* with what's left. For a group actively planning or mid-trip, "we have ₹8,000 left in Dining for 3 more days — where should we eat?" is a real, common question the app currently can't help with at all.

## 2. Goal

Let a travel group see place recommendations (restaurants, activities, attractions) that fit what's actually left in the relevant budget category, visible to every contributor on the group the same way all other group data already is.

## 3. Non-Goals (for this version)

- Booking, reservations, or payment integration
- Recommendations for non-`travel` group types (household/roommates/etc.) — out of scope, revisit later if there's demand
- Real-time availability (table bookings, sold-out attractions)
- A public/external share link for people *not* already a group member — "share with contributors" means visible to existing group members, not a new external-sharing mechanism (see §9 for why)

## 4. Key Open Decisions

These need to be settled before implementation starts — they materially change the design.

### 4.1 Where do recommendations come from?

| Option | Pros | Cons |
|---|---|---|
| **Google Places API** | Real ratings, price level, hours, live data | Costs money past a small free tier; needs its own API key/billing setup |
| **LLM (existing AI router)** | Cheap, no new integration, reuses infra already in place | Can hallucinate places that don't exist, or give stale/wrong prices — risky for something budget-critical |
| **Curated static list per destination** | Zero cost, zero hallucination risk | Doesn't scale past manually-curated destinations |

**Recommendation:** Start with Google Places API for the core "find real places nearby matching a price level" query (this is a solved problem the Places API does well — price_level, location, type filtering are native fields), and optionally layer the LLM on top only for *narrative* framing ("why this fits your group"), never for the underlying facts (name, price, existence). This mirrors the pattern already used elsewhere in this app: deterministic/structured data sources first, LLM only for framing or as a fallback — never as the source of truth for numbers.

### 4.2 Destination is missing from the data model

`GroupEditor` currently has no location/destination field for `travel` groups (only `tripEndDate`). This needs to be added — likely a free-text destination + geocoded lat/lng (via Places API's own geocoding, so we don't need a second provider) — before any location-aware recommendation is possible. This is a prerequisite, not part of this feature's core work, but blocks it.

### 4.3 What does "share with contributors" actually mean?

Since every group member already sees the same group data the moment they open the group (existing architecture — no separate sharing mechanism exists today), there are two different things this could mean:

- **(a)** Recommendations just appear inside the group UI where members already look — this requires *no new sharing mechanism*, just a new tab/section.
- **(b)** A way to highlight/notify members when a new recommendation is added or saved (e.g., "shortlist" a place for the group), and/or export an itinerary to someone outside the app entirely.

**Recommendation:** Build (a) first — it's a much smaller scope and is what "contributors already see group data" implies today. Treat (b) (notifications, saved shortlist, external export) as a fast-follow, not part of v1.

## 5. User Stories

1. As a member of a travel group, I want to see restaurant/activity suggestions that fit what's left in our Dining/Entertainment budget, so I don't have to manually check prices against our remaining balance.
2. As a group member, I want recommendations to update as the group's actual spend changes, so suggestions stay realistic as the trip progresses.
3. As any contributor on the group, I want to see the same recommendations everyone else sees, without a separate invite or share step.

## 6. Functional Requirements

- **FR1:** A travel group can set a destination (new field), which is geocoded to a lat/lng.
- **FR2:** For a selected budget category (e.g., Dining), the system computes remaining budget = `category budget − category actual spend` (reusing existing `getSubBudget`/`getCatActualMonth`), and requests nearby places filtered by a price level that roughly matches what's left, divided by remaining trip days/meals as a rough per-occasion budget.
- **FR3:** Recommendations render in a new tab/section within the existing group view (`AppView`/`Sidebar`), visible to all group members — no separate access control beyond existing group membership.
- **FR4:** Each recommendation shows: name, category/type, approximate price level, and (if available) rating — with a clear "estimated, verify locally" disclaimer, since price levels are indicative, not exact.
- **FR5:** Recommendations refresh when remaining budget changes meaningfully (e.g., on tab open, or manually via a refresh action) — not a background poll.

## 7. Non-Functional Requirements

- **Cost control:** Every places lookup costs money (Places API) — must be cached per destination+category+price-tier combination for some reasonable window (e.g., 24h) rather than re-queried on every tab open.
- **Graceful degradation:** If the Places API key isn't configured, or the group has no destination set, show a clear empty state directing the user to add a destination — never a silent failure.
- **No fabricated data:** If an LLM layer is added for narrative framing, it must never be the source of price/rating/existence facts — same principle already applied to OCR and AI Expense Entry in this app.

## 8. Data Model Changes

- `group.destination`: `{ name: string, lat: number, lng: number }` — new field, travel-type groups only initially.
- New (not persisted per-user necessarily) recommendation cache, keyed by `destination + category + priceTier`, with a TTL.

## 9. Why Not External Sharing (for now)

Building a public/external share link is a meaningfully different feature (auth-less access to a subset of group data, link expiry/security, a new UI surface) and isn't implied by "share with contributors" once you note that contributors *already* have access to everything in the group. Recommend scoping that as its own follow-up PRD if there's real demand for sharing outside the app, rather than bundling it here.

## 10. Phased Rollout

1. **Phase 0 (prerequisite):** Add `destination` field to `GroupEditor` for travel groups.
2. **Phase 1:** Places API integration + budget-matching logic + read-only recommendations tab, visible to all group members.
3. **Phase 2 (fast-follow):** Shortlist/save a recommendation to the group (visible to all members, simple boolean/list state).
4. **Phase 3 (if needed):** LLM narrative framing layer, external sharing, non-travel group types.

## 11. Success Metrics (draft — refine with stakeholders)

- % of travel groups that set a destination
- % of travel groups that open the recommendations tab at least once
- Qualitative: does remaining-budget-aware filtering actually change what people pick, vs. generic "top rated nearby"?

## 12. Risks

- **Cost creep:** Places API billing if caching/rate-limiting isn't solid from day one.
- **Recommendation quality:** Price-level filtering is coarse (Google's price_level is a 0–4 scale, not exact currency) — recommendations will be approximate, and that needs to be communicated clearly in the UI, not implied as precise.
- **Scope creep:** "Share with contributors" is easy to over-build into a full external-sharing system when the existing group model already covers the common case.
