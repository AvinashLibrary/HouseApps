"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./core/config");
const store_1 = require("./core/store");
const group_repository_1 = require("./features/group/group.repository");
const group_service_1 = require("./features/group/group.service");
const group_routes_1 = require("./features/group/group.routes");
const actuals_repository_1 = require("./features/actuals/actuals.repository");
const actuals_service_1 = require("./features/actuals/actuals.service");
const actuals_routes_1 = require("./features/actuals/actuals.routes");
const bills_repository_1 = require("./features/bills/bills.repository");
const bills_service_1 = require("./features/bills/bills.service");
const bills_routes_1 = require("./features/bills/bills.routes");
const logs_repository_1 = require("./features/logs/logs.repository");
const logs_service_1 = require("./features/logs/logs.service");
const logs_routes_1 = require("./features/logs/logs.routes");
const analysis_service_1 = require("./features/analysis/analysis.service");
const analysis_routes_1 = require("./features/analysis/analysis.routes");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const fs_1 = require("fs");
const yaml_1 = require("yaml");
// ── dependency graph ──────────────────────────────────────────────
const store = new store_1.JsonStore();
const swaggerDoc = (0, yaml_1.parse)((0, fs_1.readFileSync)('./swagger.yaml', 'utf-8'));
const groupRepo = new group_repository_1.GroupRepository(store);
const actualsRepo = new actuals_repository_1.ActualsRepository(store);
const billsRepo = new bills_repository_1.BillsRepository(store);
const logsRepo = new logs_repository_1.LogsRepository(store);
const logsService = new logs_service_1.LogsService(logsRepo);
const groupService = new group_service_1.GroupService(groupRepo);
const actualsService = new actuals_service_1.ActualsService(actualsRepo, logsRepo);
const billsService = new bills_service_1.BillsService(billsRepo, actualsRepo, logsRepo);
const analysisService = new analysis_service_1.AnalysisService(actualsRepo);
// ── express app ───────────────────────────────────────────────────
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDoc));
app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', config_1.config.allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/groups', (0, group_routes_1.groupRoutes)(groupService));
app.use('/api/groups/:groupId/actuals', (0, actuals_routes_1.actualsRoutes)(actualsService));
app.use('/api/groups/:groupId/bills', (0, bills_routes_1.billsRoutes)(billsService));
app.use('/api/groups/:groupId/logs', (0, logs_routes_1.logsRoutes)(logsService));
app.use('/api/groups/:groupId/analysis', (0, analysis_routes_1.analysisRoutes)(analysisService, groupService));
app.listen(config_1.config.port, () => console.log(`Server listening on port ${config_1.config.port}`));
//# sourceMappingURL=index.js.map