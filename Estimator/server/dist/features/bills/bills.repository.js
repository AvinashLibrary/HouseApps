"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillsRepository = void 0;
class BillsRepository {
    constructor(store) {
        this.store = store;
    }
    key(groupId) {
        return `bills/${groupId}`;
    }
    async findAll(groupId) {
        return (await this.store.read(this.key(groupId))) ?? [];
    }
    async findByMonth(groupId, monthIdx) {
        const all = await this.findAll(groupId);
        return all.filter(b => b.monthIdx === monthIdx);
    }
    async save(groupId, entry) {
        const all = await this.findAll(groupId);
        all.push(entry);
        await this.store.write(this.key(groupId), all);
        return entry;
    }
}
exports.BillsRepository = BillsRepository;
//# sourceMappingURL=bills.repository.js.map