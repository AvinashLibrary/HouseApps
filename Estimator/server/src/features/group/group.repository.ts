import type { Group } from '../../types/constant_type';
import { GroupModel } from '../../models/group.model';

// Maps a lean Mongoose doc back to the exact Group shape — never leak _id,
// __v, or timestamps into what the rest of the app treats as a Group.
function toGroup(doc: any): Group {
  return {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    members: doc.members,
    splits: doc.splits,
    budgetPcts: doc.budgetPcts,
  };
}

export class GroupRepository {
  async findAll(): Promise<Group[]> {
    const docs = await GroupModel.find().lean();
    return docs.map(toGroup);
  }

  async findById(id: string): Promise<Group | null> {
    const doc = await GroupModel.findOne({ id }).lean();
    return doc ? toGroup(doc) : null;
  }

  async save(group: Group): Promise<Group> {
    // Upsert on the app-level `id` (not Mongo's _id) — same "create or
    // replace" semantics the original JsonStore-backed save() had.
    await GroupModel.findOneAndUpdate(
      { id: group.id },
      { $set: group },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return group;
  }

  async delete(id: string): Promise<boolean> {
    const res = await GroupModel.deleteOne({ id });
    return res.deletedCount > 0;
  }
}