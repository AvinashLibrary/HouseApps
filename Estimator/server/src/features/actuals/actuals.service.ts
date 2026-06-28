import { MONTHS } from '../../types/constant_type';
import type { MonthActuals, PostActualsRequest, GetActualsResponse } from '../../types/constant_type';
import type { ActualsRepository } from './actuals.repository';
import type { LogsRepository } from '../logs/logs.repository';

export class ActualsService {
  constructor(
    private repo: ActualsRepository,
    private logs: LogsRepository,
  ) {}

  async getYear(groupId: string, year: number): Promise<GetActualsResponse> {
    const months = await this.repo.findYear(groupId, year);
    return { months };
  }

  async saveMonth(dto: PostActualsRequest): Promise<void> {
    const { groupId, year, monthIdx, actuals } = dto;
    const prev: MonthActuals = await this.repo.findMonth(groupId, year, monthIdx);

    await this.repo.saveMonth(groupId, year, monthIdx, actuals);

    const now = new Date();
    const monthName = MONTHS[monthIdx] ?? String(monthIdx);
    for (const [itemKey, newVal] of Object.entries(actuals)) {
      const oldVal = prev[itemKey] ?? 0;
      if (oldVal === newVal) continue;
      await this.logs.append(groupId, {
        ts: now,
        source: 'manual',
        path: itemKey,
        month: monthName,
        monthIdx,
        subCatKey: itemKey,
        oldVal,
        newVal,
      });
    }
  }
}
