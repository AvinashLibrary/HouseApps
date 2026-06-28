"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupService = void 0;
class GroupService {
    constructor(repo) {
        this.repo = repo;
    }
    async getAll() {
        return this.repo.findAll();
    }
    async getById(id) {
        const group = await this.repo.findById(id);
        if (!group)
            throw Object.assign(new Error(`Group ${id} not found`), { status: 404 });
        return group;
    }
    async create(dto) {
        const group = {
            id: `grp_${Date.now()}`,
            name: dto.name,
            members: dto.members,
            splits: dto.splits,
            budgetPcts: dto.budgetPcts,
        };
        return this.repo.save(group);
    }
    async update(id, dto) {
        const existing = await this.getById(id);
        const updated = { ...existing, ...dto };
        return this.repo.save(updated);
    }
    async remove(id) {
        const deleted = await this.repo.delete(id);
        if (!deleted)
            throw Object.assign(new Error(`Group ${id} not found`), { status: 404 });
    }
}
exports.GroupService = GroupService;
//# sourceMappingURL=group.service.js.map