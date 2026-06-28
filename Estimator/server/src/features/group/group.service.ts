import type { Group, PostGroupRequest } from '../../types/constant_type';
import type { GroupRepository } from './group.repository';

export class GroupService {
  constructor(private repo: GroupRepository) {}

  async getAll(): Promise<Group[]> {
    return this.repo.findAll();
  }

  async getById(id: string): Promise<Group> {
    const group = await this.repo.findById(id);
    if (!group) throw Object.assign(new Error(`Group ${id} not found`), { status: 404 });
    return group;
  }

  async create(dto: PostGroupRequest): Promise<Group> {
    const group: Group = {
      id: `grp_${Date.now()}`,
      name: dto.name,
      members: dto.members,
      splits: dto.splits,
      budgetPcts: dto.budgetPcts,
    };
    return this.repo.save(group);
  }

  async update(id: string, dto: Partial<PostGroupRequest>): Promise<Group> {
    const existing = await this.getById(id);
    const updated: Group = { ...existing, ...dto };
    return this.repo.save(updated);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw Object.assign(new Error(`Group ${id} not found`), { status: 404 });
  }
}
