import { Schema, model, type InferSchemaType } from 'mongoose';

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    providers: { type: [String], required: true, default: [] },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    avatar: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema>;
export const UserModel = model('User', UserSchema, 'users');
