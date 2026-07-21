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
    ownerId: doc.ownerId,
    viewers: doc.viewers ?? [],
  };
}

export class GroupRepository {
  // Returns all groups where the user is owner OR a viewer.
  async findAllForUser(userId: string): Promise<Group[]> {
    const docs = await GroupModel.find({
      $or: [{ ownerId: userId }, { viewers: userId }],
    }).lean();
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

  // Adds a userId to the viewers array (no-op if already present).
  async addViewer(groupId: string, userId: string): Promise<boolean> {
    const res = await GroupModel.updateOne(
      { id: groupId },
      { $addToSet: { viewers: userId } },
    );
    return res.matchedCount > 0;
  }

  async delete(id: string): Promise<boolean> {
    const res = await GroupModel.deleteOne({ id });
    return res.deletedCount > 0;
  }
}