import type { Group, YearActuals, MonthActuals, Category } from '../../types/constant_type';
import type { ActualsRepository } from '../actuals/actuals.repository';

export interface SubCatSummary {
  key: string;
  label: string;
  budget: number;
  actual: number;
  remaining: number;
  pctUsed: number;
}

export interface CatSummary {
  key: string;
  label: string;
  budget: number;
  actual: number;
  remaining: number;
  pctUsed: number;
  subs: SubCatSummary[];
}

export interface MonthSummary {
  monthIdx: number;
  totalSalary: number;
  categories: CatSummary[];
}

export class AnalysisService {
  constructor(private actuals: ActualsRepository) {}

  async getMonthSummary(group: Group, year: number, monthIdx: number, categories: Category[]): Promise<MonthSummary> {
    const yearData = await this.actuals.findYear(group.id, year);
    const monthActuals: MonthActuals = yearData[String(monthIdx)] ?? {};

    const totalSalary = group.members.reduce((sum, m) => sum + m.salary - m.familyDeduction, 0);

    const catSummaries: CatSummary[] = categories.map(cat => {
      const catBudget = cat.pct * totalSalary;

      const subSummaries: SubCatSummary[] = cat.subs.map(sub => {
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
