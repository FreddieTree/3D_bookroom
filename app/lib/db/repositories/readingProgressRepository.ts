/**
 * Persistence for reader locomotion snapshots.
 */
import { ReadingProgress } from "@/app/lib/db/models/readingProgress";

export async function getProgress(userId: string, bookId: string) {
  return ReadingProgress.findOne({ userId, bookId }).lean().exec();
}

interface CursorPatch {
  chapterIndex: number;
  paragraphId: string;
  deviceId?: string;
  percentComplete?: number;
}

export async function updateProgress(userId: string, bookId: string, patch: CursorPatch) {
  return ReadingProgress.findOneAndUpdate(
    { userId, bookId },
    {
      $set: {
        chapterIndex: patch.chapterIndex,
        paragraphId: patch.paragraphId,
        ...(patch.deviceId ? { deviceId: patch.deviceId } : {}),
        ...(typeof patch.percentComplete === "number"
          ? { percentComplete: patch.percentComplete }
          : {}),
      },
      $inc: { syncVersion: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
    .lean()
    .exec();
}

interface SyncPayload extends CursorPatch {
  /** Client-declared CAS token; rejects stale writes. */
  syncVersion?: number;
}

/** Optimistic concurrency wrapper for multi-device merges. */
export async function syncProgress(userId: string, bookId: string, patch: SyncPayload) {
  const remote = await ReadingProgress.findOne({ userId, bookId }).lean().exec();

  if (
    patch.syncVersion != null &&
    remote &&
    patch.syncVersion < remote.syncVersion
  ) {
    return { conflict: true as const, progress: remote };
  }

  const nextVersion =
    patch.syncVersion != null
      ? Math.max(patch.syncVersion, remote?.syncVersion ?? 0)
      : (remote?.syncVersion ?? 0) + 1;

  const doc = await ReadingProgress.findOneAndUpdate(
    { userId, bookId },
    {
      chapterIndex: patch.chapterIndex,
      paragraphId: patch.paragraphId,
      syncVersion: nextVersion,
      ...(patch.deviceId ? { deviceId: patch.deviceId } : {}),
      ...(typeof patch.percentComplete === "number"
        ? { percentComplete: patch.percentComplete }
        : {}),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  )
    .lean()
    .exec();

  return {
    conflict: false as const,
    progress: doc,
  };
}
