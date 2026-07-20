import jwt from 'jsonwebtoken';
import { config } from '../../core/config';

export interface JwtPayload {
  sub: string;
  email: string;
}

export class JwtService {
  sign(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  }
}
