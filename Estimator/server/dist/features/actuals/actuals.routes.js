"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualsRoutes = actualsRoutes;
const express_1 = require("express");
const constant_type_1 = require("../../types/constant_type");
const response_1 = require("../../core/response");
const validateBody_1 = require("../../middleware/validateBody");
function actualsRoutes(service) {
    const router = (0, express_1.Router)({ mergeParams: true });
    // GET /api/groups/:groupId/actuals?year=2026
    router.get('/', async (req, res) => {
        try {
            const year = Number(req.query.year ?? new Date().getFullYear());
            const data = await service.getYear(req.params.groupId, year);
            res.json((0, response_1.ok)(data));
        }
        catch (e) {
            res.status(500).json((0, response_1.err)(e));
        }
    });
    // POST /api/groups/:groupId/actuals
    router.post('/', (0, validateBody_1.validate)(constant_type_1.PostActualsSchema), async (req, res) => {
        try {
            await service.saveMonth({ ...req.body, groupId: req.params.groupId });
            res.json((0, response_1.ok)(null));
        }
        catch (e) {
            res.status(500).json((0, response_1.err)(e));
        }
    });
    return router;
}
//# sourceMappingURL=actuals.routes.js.map