import type { Group, PostGroupRequest } from '../../types/constant_type';
import type { JsonStore } from '../../core/store';

const GROUPS_KEY = 'groups';

export class GroupRepository {
  constructor(private store: JsonStore) {}

  async findAll(): Promise<Group[]> {
    return (await this.store.read<Group[]>(GROUPS_KEY)) ?? [];
  }

  async findById(id: string): Promise<Group | null> {
    const groups = await this.findAll();
    return groups.find(g => g.id === id) ?? null;
  }

  async save(group: Group): Promise<Group> {
    const groups = await this.findAll();
    const idx = groups.findIndex(g => g.id === group.id);
    if (idx === -1) {
      groups.push(group);
    } else {
      groups[idx] = group;
    }
    await this.store.write(GROUPS_KEY, groups);
    return group;
  }

  async delete(id: string): Promise<boolean> {
    const groups = await this.findAll();
    const filtered = groups.filter(g => g.id !== id);
    if (filtered.length === groups.length) return false;
    await this.store.write(GROUPS_KEY, filtered);
    return true;
  }
}
