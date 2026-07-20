import { Schema, model, type InferSchemaType } from 'mongoose';

const ActualsSchema = new Schema(
  {
    groupId: { type: String, required: true },
    year: { type: Number, required: true },
    // Mirrors YearActuals: { [monthIdx: string]: { [itemKey: string]: number } }.
    // Dynamic per-item keys, so Mixed rather than a fixed schema.
    months: { type: Schema.Types.Mixed, required: true, default: {} },
  },
);

// One document per (groupId, year) — matches the old actuals/{groupId}/{year} key exactly.
ActualsSchema.index({ groupId: 1, year: 1 }, { unique: true });

export type ActualsDocument = InferSchemaType<typeof ActualsSchema>;
export const ActualsModel = model('Actuals', ActualsSchema, 'actuals');
