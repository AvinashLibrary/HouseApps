import { Router } from 'express';
import type { Request, Response } from 'express';
import type { BillsService } from './bills.service';
import { PostBillSchema, GroupIdParam } from '../../types/constant_type';
import { ok, err } from '../../core/response';
import { validate } from '../../middleware/validateBody';

export function billsRoutes(service: BillsService): Router {
  const router = Router({ mergeParams: true });

  // GET /api/groups/:groupId/bills?monthIdx=5
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

  // POST /api/groups/:groupId/bills
  router.post('/', validate<GroupIdParam>(PostBillSchema), async (req: Request<GroupIdParam>, res: Response) => {
    try {
      const data = await service.submit({ ...req.body, groupId: req.params.groupId });
      res.status(201).json(ok(data));
    } catch (e) {
      res.status(500).json(err(e));
    }
  });

  return router;
}
