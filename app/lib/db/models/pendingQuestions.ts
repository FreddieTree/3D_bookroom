/**
 * Suspense queue entries (`pendingquestions`).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PENDING_STATUS = ["queued", "ready", "answered", "dismissed"] as const;

const pendingQuestionSchema = new Schema(
  {
    /** Owner user id. */
    userId: { type: String, required: true, index: true, trim: true },
    /** Book context. */
    bookId: { type: String, required: true, index: true, trim: true },
    /** Reader-submitted question awaiting LLM release. */
    question: { type: String, required: true },
    /** Paragraph id gating when answer may surface (anti-spoiler contract). */
    expectedReleaseParagraphId: { type: String, required: true },
    /** Workflow state for `/api/pending/check` automation. */
    status: {
      type: String,
      required: true,
      enum: PENDING_STATUS,
      default: "queued",
    },
    /** Populated once released by narrative engine. */
    answer: { type: String },
    /** Optional tie-in to analytics / conversation rows. */
    conversationId: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false },
);

pendingQuestionSchema.index({ userId: 1, bookId: 1, status: 1 });

export type PendingQuestion = InferSchemaType<typeof pendingQuestionSchema>;

export const PendingQuestion: Model<PendingQuestion> =
  (mongoose.models.PendingQuestion as Model<PendingQuestion> | undefined) ??
  mongoose.model<PendingQuestion>("PendingQuestion", pendingQuestionSchema);

export { PENDING_STATUS };
