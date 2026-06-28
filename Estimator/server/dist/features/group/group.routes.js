"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupRoutes = groupRoutes;
const express_1 = require("express");
const constant_type_1 = require("../../types/constant_type");
const response_1 = require("../../core/response");
const validateBody_1 = require("../../middleware/validateBody");
function groupRoutes(service) {
    const router = (0, express_1.Router)();
    router.get('/', async (_req, res) => {
        try {
            const data = await service.getAll();
            res.json((0, response_1.ok)(data));
        }
        catch (e) {
            res.status(500).json((0, response_1.err)(e));
        }
    });
    router.get('/:groupId', async (req, res) => {
        try {
            const data = await service.getById(req.params.groupId);
            res.json((0, response_1.ok)(data));
        }
        catch (e) {
            res.status(e.status ?? 500).json((0, response_1.err)(e));
        }
    });
    router.post('/', (0, validateBody_1.validate)(constant_type_1.PostGroupSchema), async (req, res) => {
        try {
            const dto = req.body;
            const data = await service.create(dto);
            res.status(201).json((0, response_1.ok)(data));
        }
        catch (e) {
            res.status(500).json((0, response_1.err)(e));
        }
    });
    return router;
}
//# sourceMappingURL=group.routes.js.map