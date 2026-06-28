import { Router } from 'express';
import type { Request, Response } from 'express';
import type { LogsService } from './logs.service';
import { GroupIdParam } from '../../types/constant_type';
import { ok, err } from '../../core/response';

export function logsRoutes(service: LogsService): Router {
  const router = Router({ mergeParams: true });

  // GET /api/groups/:groupId/logs?monthIdx=5
  router.get('/', async (req: Request<GroupIdParam>, res: Response) => {
    try {
      const { groupId } = req.params;
      const monthIdx = req.query.monthIdx !== undefined ? Number(req.query.monthIdx) : undefined;
      const data = monthIdx !== undefined
        ? await service.getByMonth(groupId, monthIdx)
        : await service.getAll(groupId);
      res.json(ok(data));
    } catch (e) {
      res.status(500).json(err(e));
    }
  });

  return router;
}
