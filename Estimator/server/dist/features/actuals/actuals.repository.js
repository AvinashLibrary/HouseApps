"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActualsRepository = void 0;
class ActualsRepository {
    constructor(store) {
        this.store = store;
    }
    key(groupId, year) {
        return `actuals/${groupId}/${year}`;
    }
    async findYear(groupId, year) {
        return (await this.store.read(this.key(groupId, year))) ?? {};
    }
    async findMonth(groupId, year, monthIdx) {
        const yearData = await this.findYear(groupId, year);
        return yearData[String(monthIdx)] ?? {};
    }
    async saveMonth(groupId, year, monthIdx, actuals) {
        const yearData = await this.findYear(groupId, year);
        yearData[String(monthIdx)] = actuals;
        await this.store.write(this.key(groupId, year), yearData);
    }
    async mergeMonth(groupId, year, monthIdx, patch) {
        const existing = await this.findMonth(groupId, year, monthIdx);
        const merged = { ...existing, ...patch };
        await this.saveMonth(groupId, year, monthIdx, merged);
        return merged;
    }
}
exports.ActualsRepository = ActualsRepository;
//# sourceMappingURL=actuals.repository.js.map