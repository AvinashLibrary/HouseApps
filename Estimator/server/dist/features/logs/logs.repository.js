"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsRepository = void 0;
class LogsRepository {
    constructor(store) {
        this.store = store;
    }
    key(groupId) {
        return `logs/${groupId}`;
    }
    async findAll(groupId) {
        return (await this.store.read(this.key(groupId))) ?? [];
    }
    async findByMonth(groupId, monthIdx) {
        const all = await this.findAll(groupId);
        return all.filter(e => e.monthIdx === monthIdx);
    }
    async append(groupId, entry) {
        const all = await this.findAll(groupId);
        all.push(entry);
        await this.store.write(this.key(groupId), all);
        return entry;
    }
}
exports.LogsRepository = LogsRepository;
//# sourceMappingURL=logs.repository.js.map