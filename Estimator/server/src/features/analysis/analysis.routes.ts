import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AnalysisService } from './analysis.service';
import type { GroupService } from '../group/group.service';
import { GroupIdParam } from '../../types/constant_type';
import { ok, err } from '../../core/response';

// Categories are passed as config — the frontend owns category definitions,
// so the caller POSTs them with the request until we store them server-side.
export function analysisRoutes(service: AnalysisService, groups: GroupService): Router {
  const router = Router({ mergeParams: true });

  // POST /api/groups/:groupId/analysis?year=2026&monthIdx=5
  // body: { categories: Category[] }
  router.post('/', async (req: Request<GroupIdParam>, res: Response) => {
    try {
      const { groupId } = req.params;
      const year = Number(req.query.year ?? new Date().getFullYear());
      const monthIdx = Number(req.query.monthIdx ?? 0);
      const { categories } = req.body;

      const group = await groups.getById(groupId);
      const data = await service.getMonthSummary(group, year, monthIdx, categories);
      res.json(ok(data));
    } catch (e: any) {
      res.status(e.status ?? 500).json(err(e));
    }
  });

  return router;
}
