import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../core/config';
import type { AuthRepository, UserRecord } from './auth.repository';
import type { JwtService } from './jwt.service';

const BCRYPT_ROUNDS = 12;
const googleClient = new OAuth2Client(config.googleClientId);

export interface AuthResult {
  token: string;
  user: Omit<UserRecord, 'passwordHash'>;
}

function safeUser(user: UserRecord): Omit<UserRecord, 'passwordHash'> {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

export class AuthService {
  constructor(
    private repo: AuthRepository,
    private jwt: JwtService,
  ) {}

  async localSignup(email: string, password: string, firstName: string, lastName: string): Promise<AuthResult> {
    const existing = await this.repo.findByEmail(email);
    if (existing) throw Object.assign(new Error('Email already registered'), { status: 409 });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.repo.create({
      email: email.toLowerCase(),
      providers: ['LOCAL'],
      passwordHash,
      googleId: null,
      firstName,
      lastName,
      avatar: null,
      emailVerified: false,
    });

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: safeUser(user) };
  }

  async localLogin(email: string, password: string): Promise<AuthResult> {
    const user = await this.repo.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: safeUser(user) };
  }

  async googleAuth(idToken: string): Promise<AuthResult> {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw Object.assign(new Error('Invalid Google token'), { status: 401 });
    }

    const { email, sub: googleId, given_name = '', family_name = '', picture = null } = payload;

    let user = await this.repo.findByEmail(email);
    if (!user) {
      user = await this.repo.create({
        email: email.toLowerCase(),
        providers: ['GOOGLE'],
        passwordHash: null,
        googleId,
        firstName: given_name,
        lastName: family_name,
        avatar: picture,
        emailVerified: true,
      });
    } else if (!user.providers.includes('GOOGLE')) {
      user = await this.repo.linkProvider(email, 'GOOGLE', googleId);
    }

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: safeUser(user) };
  }

  async getProfile(userId: string): Promise<Omit<UserRecord, 'passwordHash'>> {
    const user = await this.repo.findById(userId);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    return safeUser(user);
  }
}
