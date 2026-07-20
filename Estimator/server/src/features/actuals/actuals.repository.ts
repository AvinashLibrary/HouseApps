import type { YearActuals, MonthActuals } from '../../types/constant_type';
import { ActualsModel } from '../../models/actuals.model';

export class ActualsRepository {
  async findYear(groupId: string, year: number): Promise<YearActuals> {
    const doc = await ActualsModel.findOne({ groupId, year }).lean();
    return (doc?.months as YearActuals) ?? {};
  }

  async findMonth(groupId: string, year: number, monthIdx: number): Promise<MonthActuals> {
    const yearData = await this.findYear(groupId, year);
    return yearData[String(monthIdx)] ?? {};
  }

  async saveMonth(groupId: string, year: number, monthIdx: number, actuals: MonthActuals): Promise<void> {
    // Read-modify-write the whole year document, same as the original
    // JsonStore version did — kept deliberately identical rather than
    // switching to an atomic `$set: {'months.5': ...}` dot-notation update,
    // which would be a real improvement (removes the same race condition
    // that existed before) but is a behavioral change beyond "migrate to
    // Mongo" as asked. Worth doing as a explicit follow-up if it matters.
    const yearData = await this.findYear(groupId, year);
    yearData[String(monthIdx)] = actuals;
    await ActualsModel.findOneAndUpdate(
      { groupId, year },
      { $set: { months: yearData } },
      { upsert: true },
    );
  }

  async mergeMonth(groupId: string, year: number, monthIdx: number, patch: MonthActuals): Promise<MonthActuals> {
    const existing = await this.findMonth(groupId, year, monthIdx);
    const merged = { ...existing, ...patch };
    await this.saveMonth(groupId, year, monthIdx, merged);
    return merged;
  }
}