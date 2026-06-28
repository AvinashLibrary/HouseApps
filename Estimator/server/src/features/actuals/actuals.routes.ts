import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ActualsService } from './actuals.service';
import { PostActualsSchema, GroupIdParam } from '../../types/constant_type';
import { ok, err } from '../../core/response';
import { validate } from '../../middleware/validateBody';

export function actualsRoutes(service: ActualsService): Router {
  const router = Router({ mergeParams: true });

  // GET /api/groups/:groupId/actuals?year=2026
  router.get('/', async (req: Request<GroupIdParam>, res: Response) => {
    try {
      const year = Number(req.query.year ?? new Date().getFullYear());
      const data = await service.getYear(req.params.groupId, year);
      res.json(ok(data));
    } catch (e) {
      res.status(500).json(err(e));
    }
  });

  // POST /api/groups/:groupId/actuals
  router.post('/', validate<GroupIdParam>(PostActualsSchema), async (req: Request<GroupIdParam>, res: Response) => {
    try {
      await service.saveMonth({ ...req.body, groupId: req.params.groupId });
      res.json(ok(null));
    } catch (e) {
      res.status(500).json(err(e));
    }
  });

  return router;
}
