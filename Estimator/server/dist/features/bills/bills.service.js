"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillsService = void 0;
const constant_type_1 = require("../../types/constant_type");
class BillsService {
    constructor(repo, actuals, logs) {
        this.repo = repo;
        this.actuals = actuals;
        this.logs = logs;
    }
    async getAll(groupId) {
        return this.repo.findAll(groupId);
    }
    async getByMonth(groupId, monthIdx) {
        return this.repo.findByMonth(groupId, monthIdx);
    }
    async submit(dto) {
        const { groupId, year, monthIdx, amount, subCatKey, subCatLabel, fileName, note } = dto;
        const entry = {
            ts: new Date(),
            groupId,
            fileName,
            amount,
            subCatKey,
            subCatLabel,
            monthIdx,
            note,
        };
        await this.repo.save(groupId, entry);
        // Bills add to the first line-item of the sub-category (mirrors frontend submitBill logic)
        const itemKey = constant_type_1.FIRST_ITEM_KEY[subCatKey] ?? subCatKey;
        const existing = await this.actuals.findMonth(groupId, year, monthIdx);
        const oldVal = existing[itemKey] ?? 0;
        const newVal = oldVal + amount;
        await this.actuals.mergeMonth(groupId, year, monthIdx, { [itemKey]: newVal });
        const monthName = constant_type_1.MONTHS[monthIdx] ?? String(monthIdx);
        await this.logs.append(groupId, {
            ts: entry.ts,
            source: 'bill',
            path: subCatLabel,
            month: monthName,
            monthIdx,
            subCatKey,
            oldVal,
            newVal,
            note,
        });
        return entry;
    }
}
exports.BillsService = BillsService;
//# sourceMappingURL=bills.service.js.map