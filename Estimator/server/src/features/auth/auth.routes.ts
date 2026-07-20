import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validateBody';
import { authenticate, type AuthenticatedRequest } from '../../middleware/authenticate';
import { ok, err } from '../../core/response';
import type { AuthService } from './auth.service';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const GoogleSchema = z.object({
  idToken: z.string().min(1),
});

export function authRoutes(service: AuthService): Router {
  const router = Router();

  router.post('/signup', validate(SignupSchema), async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      const result = await service.localSignup(email, password, firstName, lastName);
      res.status(201).json(ok(result));
    } catch (e: any) {
      res.status(e.status ?? 500).json(err(e));
    }
  });

  router.post('/login', validate(LoginSchema), async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const result = await service.localLogin(email, password);
      res.json(ok(result));
    } catch (e: any) {
      res.status(e.status ?? 500).json(err(e));
    }
  });

  router.post('/google', validate(GoogleSchema), async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;
      const result = await service.googleAuth(idToken);
      res.json(ok(result));
    } catch (e: any) {
      res.status(e.status ?? 500).json(err(e));
    }
  });

  router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const profile = await service.getProfile(req.user!.id);
      res.json(ok(profile));
    } catch (e: any) {
      res.status(e.status ?? 500).json(err(e));
    }
  });

  return router;
}
