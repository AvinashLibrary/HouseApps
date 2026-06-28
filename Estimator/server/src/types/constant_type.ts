// ═══════════════════════════════════════════ CONSTANTS ═════
import { z } from "zod";

export type MonthName =
  | 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun'
  | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec';

export const MONTHS: MonthName[] = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

export type YearSuffix = '26' | '27'; // extend as needed

// First line-item key per sub-category — used when a bill needs an itemKey target
export const FIRST_ITEM_KEY: Record<string, string> = {
  rent:      'rent_rent',
  grocery:   'gro_groc',
  transport: 'tr_metro',
  insurance: 'ins_emi',
  health:    'hc_hosp',
  other_ess: 'oe_misc',
  shopping:  'sh_self',
  dining:    'dn_movie',
  subs:      'sb_aud',
  travel:    'tv_dom',
  misc:      'ms_adhoc',
  emfund:    'ef_cash',
  parent:    'pr_outing',
  home:      'hm_rd',
  equity:    'eq_rd',
  gold:      'gd_gold',
};

// ═══════════════════════════════════════════ BUDGET STRUCTURE ═════

export interface SubCategory {
  key: string;
  label: string;
  pct: number; // fraction 0–1, share within parent category
}

export interface Category {
  key: string;
  label: string;
  pct: number;  // fraction 0–1, share of total salary
  cls: string;  // CSS class e.g. 'cat-need'
  color: string;
  subs: SubCategory[];
}

// ═══════════════════════════════════════════ DETAIL ITEMS ═════

export interface DetailItem {
  key: string;
  label: string;
}

// { [subCategoryKey]: DetailItem[] }
export type DetailItemsMap = Record<string, DetailItem[]>;

// ═══════════════════════════════════════════ ACTUALS ═════

export type ActualsKey = string;
export type Actuals = Record<ActualsKey, number>;

// { "rent_rent": 22500, "rent_maint": 4500 }
export type MonthActuals = Record<string, number>;

// { "5": { "rent_rent": 22500 }, "6": { "rent_rent": 23000 } }
export type YearActuals = Record<string, MonthActuals>;

// ═══════════════════════════════════════════ MEMBERS & SPLITS ═════

// splits[subCatKey][memberId] = contribution % (0–100, must sum to 100 per row)
export type Splits = Record<string, Record<string, number>>;

// ═══════════════════════════════════════════ BUDGET PCTS ═════

export interface CategoryBudgetPct {
  pct: number;
  subs: Record<string, number>;
}

export type BudgetPcts = Record<string, CategoryBudgetPct>;

// ═══════════════════════════════════════════ ZOD SCHEMAS ═════
// These are the single source of truth for validation AND types.
// z.infer<typeof Schema> generates the TypeScript type automatically,
// so we don't need separate interface + schema — one definition does both.

const MemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  salary: z.number().nonnegative(),
  familyDeduction: z.number().nonnegative(),
});

export type Member = z.infer<typeof MemberSchema>;

// Splits is Record<string, Record<string, number>> — use z.record for that
const SplitsSchema = z.record(z.string(), z.record(z.string(), z.number().min(0).max(100)));

const CategoryBudgetPctSchema = z.object({
  pct: z.number().min(0).max(1),
  subs: z.record(z.string(), z.number().min(0).max(1)),
});

const BudgetPctsSchema = z.record(z.string(), CategoryBudgetPctSchema);

export const PostGroupSchema = z.object({
  name: z.string().min(1).max(100),
  members: z.array(MemberSchema).min(1),
  splits: SplitsSchema,
  budgetPcts: BudgetPctsSchema,
});

export type PostGroupRequest = z.infer<typeof PostGroupSchema>;

// ── Group entity (stored shape — has id, POST body doesn't) ──────
export interface Group {
  id: string;
  name: string;
  members: Member[];
  splits: Splits;
  budgetPcts: BudgetPcts;
}

// ── Actuals ──────────────────────────────────────────────────────

export const PostActualsSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  monthIdx: z.number().int().min(0).max(11),
  actuals: z.record(z.string(), z.number().nonnegative()),
  savedAt: z.string(),  // ISO string from frontend
});

export type PostActualsRequest = z.infer<typeof PostActualsSchema> & { groupId: string };

// GET /api/groups/:groupId/actuals?year=2026
export interface GetActualsResponse {
  months: YearActuals;
}

// ── Bills ────────────────────────────────────────────────────────

export const PostBillSchema = z.object({
  fileName: z.string().min(1),
  amount: z.number().positive(),
  subCatKey: z.string().min(1),
  subCatLabel: z.string().min(1),
  monthIdx: z.number().int().min(0).max(11),
  year: z.number().int().min(2020).max(2100),
  note: z.string(),
});

export type PostBillRequest = z.infer<typeof PostBillSchema> & { groupId: string };

// ═══════════════════════════════════════════ LOGS ═════

export type ChangeSource = 'manual' | 'bill';

export interface ChangeEntry {
  ts: Date;
  source: ChangeSource;
  path: string;
  month: string;        // e.g. "Jun"
  monthIdx: number;     // 0–11
  subCatKey: string;
  oldVal: number;
  newVal: number;
  note?: string;
}

export interface BillEntry {
  ts: Date;
  groupId: string;
  fileName: string;
  amount: number;
  subCatKey: string;
  subCatLabel: string;
  monthIdx: number;     // 0–11
  note: string;
}

// ═══════════════════════════════════════════ ROUTE PARAMS ═════
// Typed param bags used in Request<P> — keeps route handlers clean

export interface GroupIdParam {
  [key: string]: string;
  groupId: string;
}

// ═══════════════════════════════════════════ API RESPONSE WRAPPER ═════

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}

export interface ApiError {
  success: false;
  data: null;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ═══════════════════════════════════════════ UI STATE ═════
// (frontend only — not sent to backend)

export interface UIState {
  activeMonth: number;                      // 0–11
  receiptMonthFilter: number | 'all';
  collapsed: Record<string, boolean>;       // catKey → collapsed?
}
