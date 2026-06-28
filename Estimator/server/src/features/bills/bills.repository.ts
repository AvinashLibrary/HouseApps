import type { BillEntry, PostBillRequest } from '../../types/constant_type';
import type { JsonStore } from '../../core/store';

export class BillsRepository {
  constructor(private store: JsonStore) {}

  private key(groupId: string): string {
    return `bills/${groupId}`;
  }

  async findAll(groupId: string): Promise<BillEntry[]> {
    return (await this.store.read<BillEntry[]>(this.key(groupId))) ?? [];
  }

  async findByMonth(groupId: string, monthIdx: number): Promise<BillEntry[]> {
    const all = await this.findAll(groupId);
    return all.filter(b => b.monthIdx === monthIdx);
  }

  async save(groupId: string, entry: BillEntry): Promise<BillEntry> {
    const all = await this.findAll(groupId);
    all.push(entry);
    await this.store.write(this.key(groupId), all);
    return entry;
  }
}
