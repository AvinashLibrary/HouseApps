import { MONTHS, FIRST_ITEM_KEY } from '../../types/constant_type';
import type { BillEntry, PostBillRequest } from '../../types/constant_type';
import type { BillsRepository } from './bills.repository';
import type { LogsRepository } from '../logs/logs.repository';
import type { ActualsRepository } from '../actuals/actuals.repository';

export class BillsService {
  constructor(
    private repo: BillsRepository,
    private actuals: ActualsRepository,
    private logs: LogsRepository,
  ) {}

  async getAll(groupId: string): Promise<BillEntry[]> {
    return this.repo.findAll(groupId);
  }

  async getByMonth(groupId: string, monthIdx: number): Promise<BillEntry[]> {
    return this.repo.findByMonth(groupId, monthIdx);
  }

  async submit(dto: PostBillRequest): Promise<BillEntry> {
    const { groupId, year, monthIdx, amount, subCatKey, subCatLabel, fileName, note } = dto;

    const entry: BillEntry = {
      ts: new Date(),
      groupId,
      fileName,
      amount,
      subCatKey,
      subCatLabel,
      monthIdx,
      note,
    };

    await this.repo.save(groupId, entry);

    // Bills add to the first line-item of the sub-category (mirrors frontend submitBill logic)
    const itemKey = FIRST_ITEM_KEY[subCatKey] ?? subCatKey;
    const existing = await this.actuals.findMonth(groupId, year, monthIdx);
    const oldVal = existing[itemKey] ?? 0;
    const newVal = oldVal + amount;
    await this.actuals.mergeMonth(groupId, year, monthIdx, { [itemKey]: newVal });

    const monthName = MONTHS[monthIdx] ?? String(monthIdx);
    await this.logs.append(groupId, {
      ts: entry.ts,
      source: 'bill',
      path: subCatLabel,
      month: monthName,
      monthIdx,
      subCatKey,
      oldVal,
      newVal,
      note,
    });

    return entry;
  }
}
