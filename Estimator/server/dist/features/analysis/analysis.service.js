"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisService = void 0;
class AnalysisService {
    constructor(actuals) {
        this.actuals = actuals;
    }
    async getMonthSummary(group, year, monthIdx, categories) {
        const yearData = await this.actuals.findYear(group.id, year);
        const monthActuals = yearData[String(monthIdx)] ?? {};
        const totalSalary = group.members.reduce((sum, m) => sum + m.salary - m.familyDeduction, 0);
        const catSummaries = categories.map(cat => {
            const catBudget = cat.pct * totalSalary;
            const subSummaries = cat.subs.map(sub => {
                const subBudget = sub.pct * catBudget;
                const actual = monthActuals[sub.key] ?? 0;
                return {
                    key: sub.key,
                    label: sub.label,
                    budget: subBudget,
                    actual,
                    remaining: subBudget - actual,
                    pctUsed: subBudget > 0 ? actual / subBudget : 0,
                };
            });
            const catActual = subSummaries.reduce((s, x) => s + x.actual, 0);
            return {
                key: cat.key,
                label: cat.label,
                budget: catBudget,
                actual: catActual,
                remaining: catBudget - catActual,
                pctUsed: catBudget > 0 ? catActual / catBudget : 0,
                subs: subSummaries,
            };
        });
        return { monthIdx, totalSalary, categories: catSummaries };
    }
}
exports.AnalysisService = AnalysisService;
//# sourceMappingURL=analysis.service.js.map