import { Router } from 'express';
import type { Request, Response } from 'express';
import type { GroupService } from './group.service';
import { PostGroupRequest, PostGroupSchema, GroupIdParam } from '../../types/constant_type';
import { ok, err } from '../../core/response';
import { validate } from '../../middleware/validateBody';

export function groupRoutes(service: GroupService): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const data = await service.getAll();
      res.json(ok(data));
    } catch (e) {
      res.status(500).json(err(e));
    }
  });

  router.get('/:groupId', async (req: Request<GroupIdParam>, res: Response) => {
    try {
      const data = await service.getById(req.params.groupId);
      res.json(ok(data));
    } catch (e: any) {
      res.status(e.status ?? 500).json(err(e));
    }
  });

  router.post('/', validate(PostGroupSchema), async (req: Request, res: Response) => {
    try {
      const dto = req.body as PostGroupRequest;
      const data = await service.create(dto);
      res.status(201).json(ok(data));
    } catch (e) {
      res.status(500).json(err(e));
    }
  });

  return router;
}
