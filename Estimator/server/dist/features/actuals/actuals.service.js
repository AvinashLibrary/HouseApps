"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActualsService = void 0;
const constant_type_1 = require("../../types/constant_type");
class ActualsService {
    constructor(repo, logs) {
        this.repo = repo;
        this.logs = logs;
    }
    async getYear(groupId, year) {
        const months = await this.repo.findYear(groupId, year);
        return { months };
    }
    async saveMonth(dto) {
        const { groupId, year, monthIdx, actuals } = dto;
        const prev = await this.repo.findMonth(groupId, year, monthIdx);
        await this.repo.saveMonth(groupId, year, monthIdx, actuals);
        const now = new Date();
        const monthName = constant_type_1.MONTHS[monthIdx] ?? String(monthIdx);
        for (const [itemKey, newVal] of Object.entries(actuals)) {
            const oldVal = prev[itemKey] ?? 0;
            if (oldVal === newVal)
                continue;
            await this.logs.append(groupId, {
                ts: now,
                source: 'manual',
                path: itemKey,
                month: monthName,
                monthIdx,
                subCatKey: itemKey,
                oldVal,
                newVal,
            });
        }
    }
}
exports.ActualsService = ActualsService;
//# sourceMappingURL=actuals.service.js.map