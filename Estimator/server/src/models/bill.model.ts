import { Schema, model, type InferSchemaType } from 'mongoose';

const BillSchema = new Schema(
  {
    groupId: { type: String, required: true, index: true },
    ts: { type: Date, required: true },
    fileName: { type: String, required: true },
    amount: { type: Number, required: true },
    subCatKey: { type: String, required: true },
    subCatLabel: { type: String, required: true },
    monthIdx: { type: Number, required: true, min: 0, max: 11 },
    note: { type: String, default: '' },
  },
);

// Compound index — every read here is scoped by groupId and usually further
// filtered/sorted by month, so this covers both findAll and findByMonth well.
BillSchema.index({ groupId: 1, monthIdx: 1 });

export type BillDocument = InferSchemaType<typeof BillSchema>;
export const BillModel = model('Bill', BillSchema, 'bills');
