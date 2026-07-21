import { Router } from 'express';
import type { Request, Response } from 'express';
import type { GroupService } from './group.service';
import { PostGroupRequest, PostGroupSchema, GroupIdParam } from '../../types/constant_type';
import { ok, err } from '../../core/response';
import { validate } from '../../middleware/validateBody';
import { authenticate, type AuthenticatedRequest } from '../../middleware/authenticate';
import { z } from 'zod';

// Body schema for adding a viewer: just a userId string.
const AddViewerSchema = z.object({ userId: z.string().min(1) });

export function groupRoutes(service: GroupService): Router {
  const router = Router();

  // All group routes require a valid JWT — authenticate runs first on every route.
  router.use(authenticate);

  // GET /api/groups — returns groups the authenticated user owns or can view
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await service.getAll(req.user!.id);
      res.json(ok(data));
    } catch (e) {
      res.status(500).json(err(e));
    }
  });

  // GET /api/groups/:groupId — owner or viewer can fetch
  router.get('/:groupId', async (req: AuthenticatedRequest & Request<GroupIdParam>, res: Response) => {
    try {
      const data = await service.getByIdForUser(req.params.groupId, req.user!.id);
      res.json(ok(data));
    } catch (e: any) {
      res.status(e.status ?? 500).json(err(e));
    }
  });

  // POST /api/groups — create a new group; ownerId set from JWT
  router.post('/', validate(PostGroupSchema), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dto = req.body as PostGroupRequest;
      const data = await service.create(dto, req.user!.id);
      res.status(201).json(ok(data));
    } catch (e) {
      res.status(500).json(err(e));
    }
  });

  // PUT /api/groups/:groupId — owner only
  router.put('/:groupId', validate(PostGroupSchema), async (req: AuthenticatedRequest & Request<GroupIdParam>, res: Response) => {
    try {
      const dto = req.body as PostGroupRequest;
      const data = await service.update(req.params.groupId, dto, req.user!.id);
      res.json(ok(data));
    } catch (e: any) {
      res.status(e.status ?? 500).json(err(e));
    }
  });

  // DELETE /api/groups/:groupId — owner only
  router.delete('/:groupId', async (req: AuthenticatedRequest & Request<GroupIdParam>, res: Response) => {
    try {
      await service.remove(req.params.groupId, req.user!.id);
      res.json(ok({ deleted: true }));
    } catch (e: any) {
      res.status(e.status ?? 500).json(err(e));
    }
  });

  // POST /api/groups/:groupId/viewers — owner adds a viewer by userId
  // Body: { "userId": "<mongo _id of the user to grant access>" }
  router.post('/:groupId/viewers', validate(AddViewerSchema), async (req: AuthenticatedRequest & Request<GroupIdParam>, res: Response) => {
    try {
      await service.addViewer(req.params.groupId, req.body.userId, req.user!.id);
      res.json(ok({ added: true }));
    } catch (e: any) {
      res.status(e.status ?? 500).json(err(e));
    }
  });

  return router;
}