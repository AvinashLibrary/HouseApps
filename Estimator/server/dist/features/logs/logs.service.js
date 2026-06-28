"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsService = void 0;
class LogsService {
    constructor(repo) {
        this.repo = repo;
    }
    async getAll(groupId) {
        return this.repo.findAll(groupId);
    }
    async getByMonth(groupId, monthIdx) {
        return this.repo.findByMonth(groupId, monthIdx);
    }
}
exports.LogsService = LogsService;
//# sourceMappingURL=logs.service.js.map