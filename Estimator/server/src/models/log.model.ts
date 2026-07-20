import { Schema, model, type InferSchemaType } from 'mongoose';

const LogSchema = new Schema(
  {
    // Not part of the ChangeEntry TS interface (the old JsonStore encoded
    // group scope via the file path key, not a field on the entry itself) —
    // added here since Mongo needs an explicit field to scope by group, and
    // stripped back out by the repository before returning ChangeEntry objects.
    groupId: { type: String, required: true, index: true },
    ts: { type: Date, required: true },
    source: { type: String, required: true, enum: ['manual', 'bill'] },
    path: { type: String, required: true },
    month: { type: String, required: true },
    monthIdx: { type: Number, required: true, min: 0, max: 11 },
    subCatKey: { type: String, required: true },
    oldVal: { type: Number, required: true },
    newVal: { type: Number, required: true },
    note: { type: String },
  },
);

LogSchema.index({ groupId: 1, monthIdx: 1 });

export type LogDocument = InferSchemaType<typeof LogSchema>;
export const LogModel = model('Log', LogSchema, 'logs');
