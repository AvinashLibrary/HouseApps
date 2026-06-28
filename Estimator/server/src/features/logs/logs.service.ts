import type { ChangeEntry } from '../../types/constant_type';
import type { LogsRepository } from './logs.repository';

export class LogsService {
  constructor(private repo: LogsRepository) {}

  async getAll(groupId: string): Promise<ChangeEntry[]> {
    return this.repo.findAll(groupId);
  }

  async getByMonth(groupId: string, monthIdx: number): Promise<ChangeEntry[]> {
    return this.repo.findByMonth(groupId, monthIdx);
  }
}
