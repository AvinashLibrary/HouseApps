"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisRoutes = analysisRoutes;
const express_1 = require("express");
const response_1 = require("../../core/response");
// Categories are passed as config — the frontend owns category definitions,
// so the caller POSTs them with the request until we store them server-side.
function analysisRoutes(service, groups) {
    const router = (0, express_1.Router)({ mergeParams: true });
    // POST /api/groups/:groupId/analysis?year=2026&monthIdx=5
    // body: { categories: Category[] }
    router.post('/', async (req, res) => {
        try {
            const { groupId } = req.params;
            const year = Number(req.query.year ?? new Date().getFullYear());
            const monthIdx = Number(req.query.monthIdx ?? 0);
            const { categories } = req.body;
            const group = await groups.getById(groupId);
            const data = await service.getMonthSummary(group, year, monthIdx, categories);
            res.json((0, response_1.ok)(data));
        }
        catch (e) {
            res.status(e.status ?? 500).json((0, response_1.err)(e));
        }
    });
    return router;
}
//# sourceMappingURL=analysis.routes.js.map