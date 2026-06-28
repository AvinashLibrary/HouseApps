"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostBillSchema = exports.PostActualsSchema = exports.PostGroupSchema = exports.FIRST_ITEM_KEY = exports.MONTHS = void 0;
// ═══════════════════════════════════════════ CONSTANTS ═════
const zod_1 = require("zod");
exports.MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
// First line-item key per sub-category — used when a bill needs an itemKey target
exports.FIRST_ITEM_KEY = {
    rent: 'rent_rent',
    grocery: 'gro_groc',
    transport: 'tr_metro',
    insurance: 'ins_emi',
    health: 'hc_hosp',
    other_ess: 'oe_misc',
    shopping: 'sh_self',
    dining: 'dn_movie',
    subs: 'sb_aud',
    travel: 'tv_dom',
    misc: 'ms_adhoc',
    emfund: 'ef_cash',
    parent: 'pr_outing',
    home: 'hm_rd',
    equity: 'eq_rd',
    gold: 'gd_gold',
};
// ═══════════════════════════════════════════ ZOD SCHEMAS ═════
// These are the single source of truth for validation AND types.
// z.infer<typeof Schema> generates the TypeScript type automatically,
// so we don't need separate interface + schema — one definition does both.
const MemberSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    color: zod_1.z.string().min(1),
    salary: zod_1.z.number().nonnegative(),
    familyDeduction: zod_1.z.number().nonnegative(),
});
// Splits is Record<string, Record<string, number>> — use z.record for that
const SplitsSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.record(zod_1.z.string(), zod_1.z.number().min(0).max(100)));
const CategoryBudgetPctSchema = zod_1.z.object({
    pct: zod_1.z.number().min(0).max(1),
    subs: zod_1.z.record(zod_1.z.string(), zod_1.z.number().min(0).max(1)),
});
const BudgetPctsSchema = zod_1.z.record(zod_1.z.string(), CategoryBudgetPctSchema);
exports.PostGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    members: zod_1.z.array(MemberSchema).min(1),
    splits: SplitsSchema,
    budgetPcts: BudgetPctsSchema,
});
// ── Actuals ──────────────────────────────────────────────────────
exports.PostActualsSchema = zod_1.z.object({
    year: zod_1.z.number().int().min(2020).max(2100),
    monthIdx: zod_1.z.number().int().min(0).max(11),
    actuals: zod_1.z.record(zod_1.z.string(), zod_1.z.number().nonnegative()),
    savedAt: zod_1.z.string(), // ISO string from frontend
});
// ── Bills ────────────────────────────────────────────────────────
exports.PostBillSchema = zod_1.z.object({
    fileName: zod_1.z.string().min(1),
    amount: zod_1.z.number().positive(),
    subCatKey: zod_1.z.string().min(1),
    subCatLabel: zod_1.z.string().min(1),
    monthIdx: zod_1.z.number().int().min(0).max(11),
    year: zod_1.z.number().int().min(2020).max(2100),
    note: zod_1.z.string(),
});
//# sourceMappingURL=constant_type.js.map