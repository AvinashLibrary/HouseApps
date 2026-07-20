import type { ChangeEntry } from '../../types/constant_type';
import { LogModel } from '../../models/log.model';

// groupId lives on the Mongo document (needed to scope queries — Mongo has
// no per-group file partitioning the way JsonStore did) but was never part
// of the ChangeEntry interface, so it's stripped back out here.
function toChangeEntry(doc: any): ChangeEntry {
  return {
    ts: doc.ts,
    source: doc.source,
    path: doc.path,
    month: doc.month,
    monthIdx: doc.monthIdx,
    subCatKey: doc.subCatKey,
    oldVal: doc.oldVal,
    newVal: doc.newVal,
    note: doc.note,
  };
}

export class LogsRepository {
  async findAll(groupId: string): Promise<ChangeEntry[]> {
    const docs = await LogModel.find({ groupId }).sort({ ts: 1 }).lean();
    return docs.map(toChangeEntry);
  }

  async findByMonth(groupId: string, monthIdx: number): Promise<ChangeEntry[]> {
    const docs = await LogModel.find({ groupId, monthIdx }).sort({ ts: 1 }).lean();
    return docs.map(toChangeEntry);
  }

  async append(groupId: string, entry: ChangeEntry): Promise<ChangeEntry> {
    await LogModel.create({ ...entry, groupId });
    return entry;
  }
}