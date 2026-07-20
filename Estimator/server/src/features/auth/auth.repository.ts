import { UserModel } from '../../models/user.model';

export interface UserRecord {
  id: string;
  email: string;
  providers: string[];
  passwordHash: string | null;
  googleId: string | null;
  firstName: string;
  lastName: string;
  avatar: string | null;
  emailVerified: boolean;
}

function toUser(doc: any): UserRecord {
  return {
    id: String(doc._id),
    email: doc.email,
    providers: doc.providers,
    passwordHash: doc.passwordHash ?? null,
    googleId: doc.googleId ?? null,
    firstName: doc.firstName ?? '',
    lastName: doc.lastName ?? '',
    avatar: doc.avatar ?? null,
    emailVerified: doc.emailVerified ?? false,
  };
}

export class AuthRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    return doc ? toUser(doc) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const doc = await UserModel.findById(id).lean();
    return doc ? toUser(doc) : null;
  }

  async create(data: Omit<UserRecord, 'id'>): Promise<UserRecord> {
    const doc = await UserModel.create(data);
    return toUser(doc.toObject());
  }

  async linkProvider(email: string, provider: string, googleId?: string): Promise<UserRecord> {
    const update: any = { $addToSet: { providers: provider } };
    if (googleId) update.$set = { googleId };
    const doc = await UserModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      update,
      { new: true },
    ).lean();
    if (!doc) throw new Error(`User ${email} not found`);
    return toUser(doc);
  }
}
