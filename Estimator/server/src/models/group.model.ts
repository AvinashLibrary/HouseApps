import { Schema, model, type InferSchemaType } from 'mongoose';

const MemberSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    salary: { type: Number, required: true },
    familyDeduction: { type: Number, required: true },
  },
  { _id: false },
);

const GroupSchema = new Schema(
  {
    // App-level identifier used everywhere as `groupId` (route params, other
    // collections' groupId fields) — deliberately separate from Mongo's own
    // _id so nothing outside this file needs to know Mongo is involved.
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    members: { type: [MemberSchema], required: true },

    // ── Ownership & access ────────────────────────────────────────
    // The MongoDB _id (as string) of the User who created this group.
    ownerId: { type: String, required: true, index: true },
    // User IDs that can VIEW this group (read-only). Owner is NOT listed here.
    viewers: { type: [String], default: [] },

    // Dynamic keyed-by-subCatKey/memberId shape (see constant_type.ts's
    // Splits/BudgetPcts types) — not a fixed set of fields, so Mixed rather
    // than modeling every possible category/member key.
    splits: { type: Schema.Types.Mixed, required: true, default: {} },
    budgetPcts: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  { timestamps: true },
);

export type GroupDocument = InferSchemaType<typeof GroupSchema>;
export const GroupModel = model('Group', GroupSchema, 'groups');