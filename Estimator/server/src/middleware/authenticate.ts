import type { Request, Response, NextFunction } from 'express';
import { JwtService } from '../features/auth/jwt.service';

const jwtService = new JwtService();

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, data: null, error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwtService.verify(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ success: false, data: null, error: 'Invalid or expired token' });
  }
}
