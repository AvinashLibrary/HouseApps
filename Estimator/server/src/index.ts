import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';


import { config } from './core/config';
import { JsonStore } from './core/store';

import { GroupRepository } from './features/group/group.repository';
import { GroupService } from './features/group/group.service';
import { groupRoutes } from './features/group/group.routes';

import { ActualsRepository } from './features/actuals/actuals.repository';
import { ActualsService } from './features/actuals/actuals.service';
import { actualsRoutes } from './features/actuals/actuals.routes';

import { BillsRepository } from './features/bills/bills.repository';
import { BillsService } from './features/bills/bills.service';
import { billsRoutes } from './features/bills/bills.routes';

import { LogsRepository } from './features/logs/logs.repository';
import { LogsService } from './features/logs/logs.service';
import { logsRoutes } from './features/logs/logs.routes';

import { AnalysisService } from './features/analysis/analysis.service';
import { analysisRoutes } from './features/analysis/analysis.routes';

import { OcrRepository } from './features/ocr/ocr.repository';
import { OcrService } from './features/ocr/ocr.service';
import { ocrRoutes } from './features/ocr/ocr.routes';

import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { parse } from 'yaml';





// ── dependency graph ──────────────────────────────────────────────
const store = new JsonStore();
const swaggerDoc = parse(readFileSync('./swagger.yaml', 'utf-8'));
const groupRepo    = new GroupRepository(store);
const actualsRepo  = new ActualsRepository(store);
const billsRepo    = new BillsRepository(store);
const logsRepo     = new LogsRepository(store);

const logsService     = new LogsService(logsRepo);
const groupService    = new GroupService(groupRepo);
const actualsService  = new ActualsService(actualsRepo, logsRepo);
const billsService    = new BillsService(billsRepo, actualsRepo, logsRepo);
const analysisService = new AnalysisService(actualsRepo);

const ocrRepo    = new OcrRepository();
const ocrService = new OcrService(ocrRepo);

// ── express app ───────────────────────────────────────────────────
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: config.allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/groups', groupRoutes(groupService));
app.use('/api/groups/:groupId/actuals', actualsRoutes(actualsService));
app.use('/api/groups/:groupId/bills', billsRoutes(billsService));
app.use('/api/groups/:groupId/logs', logsRoutes(logsService));
app.use('/api/groups/:groupId/analysis', analysisRoutes(analysisService, groupService));
app.use('/api/groups/:groupId/ocr', ocrRoutes(ocrService));

app.listen(config.port, () => console.log(`Server listening on port ${config.port}`));