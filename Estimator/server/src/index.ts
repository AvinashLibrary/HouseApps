import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';


import { config } from './core/config';
import { connectDatabase } from './core/database';

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

import { OcrEngine } from './features/ocr/ocr-engine';
import { LlmFallbackRepository } from './features/ocr/llm-fallback.repository';
import { OcrService } from './features/ocr/ocr.service';
import { ocrRoutes } from './features/ocr/ocr.routes';

import { AuthRepository } from './features/auth/auth.repository';
import { AuthService } from './features/auth/auth.service';
import { JwtService } from './features/auth/jwt.service';
import { authRoutes } from './features/auth/auth.routes';
import { authenticate } from './middleware/authenticate';

import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { parse } from 'yaml';





// ── dependency graph ──────────────────────────────────────────────
const swaggerDoc = parse(readFileSync('./swagger.yaml', 'utf-8'));
const groupRepo    = new GroupRepository();
const actualsRepo  = new ActualsRepository();
const billsRepo    = new BillsRepository();
const logsRepo     = new LogsRepository();

const logsService     = new LogsService(logsRepo);
const groupService    = new GroupService(groupRepo);
const actualsService  = new ActualsService(actualsRepo, logsRepo);
const billsService    = new BillsService(billsRepo, actualsRepo, logsRepo);
const analysisService = new AnalysisService(actualsRepo);

const ocrEngine    = new OcrEngine();
const llmFallback  = new LlmFallbackRepository();
const ocrService   = new OcrService(ocrEngine, llmFallback);

const authRepo     = new AuthRepository();
const jwtService   = new JwtService();
const authService  = new AuthService(authRepo, jwtService);

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

app.use('/api/auth', authRoutes(authService));

app.use('/api/groups', authenticate, groupRoutes(groupService));
app.use('/api/groups/:groupId/actuals', authenticate, actualsRoutes(actualsService));
app.use('/api/groups/:groupId/bills', authenticate, billsRoutes(billsService));
app.use('/api/groups/:groupId/logs', authenticate, logsRoutes(logsService));
app.use('/api/groups/:groupId/analysis', authenticate, analysisRoutes(analysisService, groupService));
app.use('/api/groups/:groupId/ocr', authenticate, ocrRoutes(ocrService));

// Top-level await isn't available under CommonJS output, so startup is
// wrapped in an async function — the server only starts accepting requests
// once the single shared Mongoose connection is actually established.
(async () => {
  await connectDatabase();
  app.listen(config.port, () => console.log(`Server listening on port ${config.port}`));
})();