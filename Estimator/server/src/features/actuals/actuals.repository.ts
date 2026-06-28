import type { YearActuals, MonthActuals } from '../../types/constant_type';
import type { JsonStore } from '../../core/store';

export class ActualsRepository {
  constructor(private store: JsonStore) {}

  private key(groupId: string, year: number): string {
    return `actuals/${groupId}/${year}`;
  }

  async findYear(groupId: string, year: number): Promise<YearActuals> {
    return (await this.store.read<YearActuals>(this.key(groupId, year))) ?? {};
  }

  async findMonth(groupId: string, year: number, monthIdx: number): Promise<MonthActuals> {
    const yearData = await this.findYear(groupId, year);
    return yearData[String(monthIdx)] ?? {};
  }

  async saveMonth(groupId: string, year: number, monthIdx: number, actuals: MonthActuals): Promise<void> {
    const yearData = await this.findYear(groupId, year);
    yearData[String(monthIdx)] = actuals;
    await this.store.write(this.key(groupId, year), yearData);
  }

  async mergeMonth(groupId: string, year: number, monthIdx: number, patch: MonthActuals): Promise<MonthActuals> {
    const existing = await this.findMonth(groupId, year, monthIdx);
    const merged = { ...existing, ...patch };
    await this.saveMonth(groupId, year, monthIdx, merged);
    return merged;
  }
}
