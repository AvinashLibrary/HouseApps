import type { Group, PostGroupRequest } from '../../types/constant_type';
import type { GroupRepository } from './group.repository';

export class GroupService {
  constructor(private repo: GroupRepository) {}

  // Returns only groups the user owns or can view.
  async getAll(userId: string): Promise<Group[]> {
    return this.repo.findAllForUser(userId);
  }

  async getById(id: string): Promise<Group> {
    const group = await this.repo.findById(id);
    if (!group) throw Object.assign(new Error(`Group ${id} not found`), { status: 404 });
    return group;
  }

  // Ensures the requesting user can access the group (owner or viewer).
  async getByIdForUser(id: string, userId: string): Promise<Group> {
    const group = await this.getById(id);
    const canAccess = group.ownerId === userId || group.viewers.includes(userId);
    if (!canAccess) throw Object.assign(new Error('Forbidden'), { status: 403 });
    return group;
  }

  // ownerId is always passed from the JWT — never trusted from the request body.
  async create(dto: PostGroupRequest, ownerId: string): Promise<Group> {
    const group: Group = {
      id: `grp_${Date.now()}`,
      name: dto.name,
      members: dto.members,
      splits: dto.splits,
      budgetPcts: dto.budgetPcts,
      type: dto.type,
      ownerId,
      viewers: dto.viewers ?? [],
    };
    return this.repo.save(group);
  }

  async update(id: string, dto: Partial<PostGroupRequest>, userId: string): Promise<Group> {
    const existing = await this.getByIdForUser(id, userId);
    // Only the owner can update — viewers are read-only.
    if (existing.ownerId !== userId) {
      throw Object.assign(new Error('Only the group owner can update it'), { status: 403 });
    }
    const updated: Group = { ...existing, ...dto };
    return this.repo.save(updated);
  }

  // Add a userId as a viewer. Only the owner can grant view access.
  async addViewer(groupId: string, viewerUserId: string, requestingUserId: string): Promise<void> {
    const group = await this.getById(groupId);
    if (group.ownerId !== requestingUserId) {
      throw Object.assign(new Error('Only the group owner can add viewers'), { status: 403 });
    }
    if (group.ownerId === viewerUserId) {
      throw Object.assign(new Error('Owner is already the owner, cannot be added as viewer'), { status: 400 });
    }
    const matched = await this.repo.addViewer(groupId, viewerUserId);
    if (!matched) throw Object.assign(new Error(`Group ${groupId} not found`), { status: 404 });
  }

  async remove(id: string, userId: string): Promise<void> {
    const group = await this.getByIdForUser(id, userId);
    if (group.ownerId !== userId) {
      throw Object.assign(new Error('Only the group owner can delete it'), { status: 403 });
    }
    await this.repo.delete(id);
  }
}