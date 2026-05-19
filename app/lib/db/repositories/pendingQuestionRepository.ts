/**
 * Persistence for spoiler/suspense release queue experimentation.
 */
import mongoose from "mongoose";

import { PendingQuestion } from "@/app/lib/db/models/pendingQuestions";

export async function addPending(
  userId: string,
  bookId: string,
  question: string,
  expectedReleaseParagraphId: string,
) {
  return PendingQuestion.create({
    userId,
    bookId,
    question,
    expectedReleaseParagraphId,
    status: "queued",
  });
}

export async function findPendingQueue(userId: string, bookId: string | undefined, limit = 50) {
  return PendingQuestion.find({
    userId,
    ...(bookId ? { bookId } : {}),
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()
    .exec();
}

/** Rows whose release gate equals the paragraph the reader landed on. */
export async function checkReadyPendings(
  userId: string,
  bookId: string,
  currentParagraphId: string,
) {
  return PendingQuestion.find({
    userId,
    bookId,
    status: { $in: ["queued", "ready"] },
    expectedReleaseParagraphId: currentParagraphId,
  })
    .lean()
    .exec();
}

/** Promote suspense entry with LLM-produced answer snippet. */
export async function releasePending(pendingId: string, answer: string) {
  if (!mongoose.Types.ObjectId.isValid(pendingId)) {
    return null;
  }
  return PendingQuestion.findByIdAndUpdate(
    pendingId,
    { answer, status: "answered" },
    { new: true, runValidators: true },
  )
    .lean()
    .exec();
}
