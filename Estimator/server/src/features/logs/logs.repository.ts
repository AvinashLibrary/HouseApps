import type { ChangeEntry } from '../../types/constant_type';
import type { JsonStore } from '../../core/store';

export class LogsRepository {
  constructor(private store: JsonStore) {}

  private key(groupId: string): string {
    return `logs/${groupId}`;
  }

  async findAll(groupId: string): Promise<ChangeEntry[]> {
    return (await this.store.read<ChangeEntry[]>(this.key(groupId))) ?? [];
  }

  async findByMonth(groupId: string, monthIdx: number): Promise<ChangeEntry[]> {
    const all = await this.findAll(groupId);
    return all.filter(e => e.monthIdx === monthIdx);
  }

  async append(groupId: string, entry: ChangeEntry): Promise<ChangeEntry> {
    const all = await this.findAll(groupId);
    all.push(entry);
    await this.store.write(this.key(groupId), all);
    return entry;
  }
}
