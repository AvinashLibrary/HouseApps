import type { BillEntry } from '../../types/constant_type';
import { BillModel } from '../../models/bill.model';

function toBillEntry(doc: any): BillEntry {
  return {
    ts: doc.ts,
    groupId: doc.groupId,
    fileName: doc.fileName,
    amount: doc.amount,
    subCatKey: doc.subCatKey,
    subCatLabel: doc.subCatLabel,
    monthIdx: doc.monthIdx,
    note: doc.note,
  };
}

export class BillsRepository {
  async findAll(groupId: string): Promise<BillEntry[]> {
    // Ascending by ts — matches the old JsonStore array's push() order
    // (oldest first), so nothing downstream that assumed that order breaks.
    const docs = await BillModel.find({ groupId }).sort({ ts: 1 }).lean();
    return docs.map(toBillEntry);
  }

  async findByMonth(groupId: string, monthIdx: number): Promise<BillEntry[]> {
    const docs = await BillModel.find({ groupId, monthIdx }).sort({ ts: 1 }).lean();
    return docs.map(toBillEntry);
  }

  async save(groupId: string, entry: BillEntry): Promise<BillEntry> {
    await BillModel.create({ ...entry, groupId });
    return entry;
  }
}