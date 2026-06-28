"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billsRoutes = billsRoutes;
const express_1 = require("express");
const constant_type_1 = require("../../types/constant_type");
const response_1 = require("../../core/response");
const validateBody_1 = require("../../middleware/validateBody");
function billsRoutes(service) {
    const router = (0, express_1.Router)({ mergeParams: true });
    // GET /api/groups/:groupId/bills?monthIdx=5
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
    // POST /api/groups/:groupId/bills
    router.post('/', (0, validateBody_1.validate)(constant_type_1.PostBillSchema), async (req, res) => {
        try {
            const data = await service.submit({ ...req.body, groupId: req.params.groupId });
            res.status(201).json((0, response_1.ok)(data));
        }
        catch (e) {
            res.status(500).json((0, response_1.err)(e));
        }
    });
    return router;
}
//# sourceMappingURL=bills.routes.js.map