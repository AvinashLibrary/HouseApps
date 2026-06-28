"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logsRoutes = logsRoutes;
const express_1 = require("express");
const response_1 = require("../../core/response");
function logsRoutes(service) {
    const router = (0, express_1.Router)({ mergeParams: true });
    // GET /api/groups/:groupId/logs?monthIdx=5
    router.get('/', async (req, res) => {
        try {
            const { groupId } = req.params;
            const monthIdx = req.query.monthIdx !== undefined ? Number(req.query.monthIdx) : undefined;
            const data = monthIdx !== undefined
                ? await service.getByMonth(groupId, monthIdx)
                : await service.getAll(groupId);
            res.json((0, response_1.ok)(data));
        }
        catch (e) {
            res.status(500).json((0, response_1.err)(e));
        }
    });
    return router;
}
//# sourceMappingURL=logs.routes.js.map