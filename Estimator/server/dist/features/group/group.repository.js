"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupRepository = void 0;
const GROUPS_KEY = 'groups';
class GroupRepository {
    constructor(store) {
        this.store = store;
    }
    async findAll() {
        return (await this.store.read(GROUPS_KEY)) ?? [];
    }
    async findById(id) {
        const groups = await this.findAll();
        return groups.find(g => g.id === id) ?? null;
    }
    async save(group) {
        const groups = await this.findAll();
        const idx = groups.findIndex(g => g.id === group.id);
        if (idx === -1) {
            groups.push(group);
        }
        else {
            groups[idx] = group;
        }
        await this.store.write(GROUPS_KEY, groups);
        return group;
    }
    async delete(id) {
        const groups = await this.findAll();
        const filtered = groups.filter(g => g.id !== id);
        if (filtered.length === groups.length)
            return false;
        await this.store.write(GROUPS_KEY, filtered);
        return true;
    }
}
exports.GroupRepository = GroupRepository;
//# sourceMappingURL=group.repository.js.map