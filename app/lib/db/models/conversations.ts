/**
 * AI companion transcript buffer (`conversations`).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const MESSAGE_ROLES = ["user", "assistant", "system"] as const;

const messageSchema = new Schema(
  {
    /** Stable message id suitable for caching + dedupe. */
    messageId: { type: String, required: true },
    /** Dialogue role discriminator. */
    role: { type: String, required: true, enum: MESSAGE_ROLES },
    /** Multimodal payload placeholder (later JSON string / markdown). */
    content: { type: String, required: true },
    /** Client-side authoring timestamp fallback. */
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const conversationSchema = new Schema(
  {
    /** Owning user id. */
    userId: { type: String, required: true, index: true, trim: true },
    /** Narrative lane this chat refers to (`books.bookId`). */
    bookId: { type: String, required: true, index: true, trim: true },
    /** Ordered MiniMax transcripts for replay tooling. */
    messages: {
      type: [messageSchema],
      default: [],
    },
    /** Lightweight topic tag enabling multi-thread future work. */
    topic: { type: String, trim: true, default: "default" },
    /** TTL helper for archiving stale threads. */
    lastMessageAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, versionKey: false },
);

conversationSchema.index({ userId: 1, bookId: 1, topic: 1 }, { unique: true });

export type Conversation = InferSchemaType<typeof conversationSchema>;

export const Conversation: Model<Conversation> =
  (mongoose.models.Conversation as Model<Conversation> | undefined) ??
  mongoose.model<Conversation>("Conversation", conversationSchema);

export { MESSAGE_ROLES };
