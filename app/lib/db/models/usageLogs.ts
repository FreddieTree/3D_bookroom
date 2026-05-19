/**
 * Telemetry + billing hooks (`usagelogs`).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const usageLogSchema = new Schema(
  {
    /** Acting user id (nullable for anonymous probes). */
    userId: { type: String, trim: true, index: true },
    /** High-level routing label (`chat.post`, `image.generate`, …). */
    action: { type: String, required: true, trim: true },
    /** Model identifier for reconciliation with vendor dashboards. */
    model: { type: String, trim: true },
    /** Estimated prompt tokens billed upstream. */
    tokenIn: { type: Number, min: 0 },
    /** Estimated completion tokens billed upstream. */
    tokenOut: { type: Number, min: 0 },
    /** Arbitrary enrichment (latency, retries, geo). */
    meta: { type: Schema.Types.Mixed },
    /** Dedicated timestamp alias for TTL indexes (defaults to creation). */
    recordedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
  },
  { timestamps: false, versionKey: false },
);

export type UsageLog = InferSchemaType<typeof usageLogSchema>;

export const UsageLog: Model<UsageLog> =
  (mongoose.models.UsageLog as Model<UsageLog> | undefined) ??
  mongoose.model<UsageLog>("UsageLog", usageLogSchema);
