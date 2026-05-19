/**
 * Canonical user envelope (`users` collection).
 *
 * Mirrors product accounts before full auth integration (temporary device ids acceptable).
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SUBSCRIPTION_TIERS = ["free", "reader", "pro"] as const;
const THEME_PREF = ["light", "dark", "system"] as const;
const LANG_PREF = ["zh", "en"] as const;

const deviceSchema = new Schema(
  {
    /** Stable per-install hardware identifier surfaced from clients. */
    deviceId: { type: String, required: true, trim: true },
    /** Human label for UX ("iPhone · Safari PWA"). */
    deviceName: { type: String, required: true, trim: true },
    /** Last telemetry heartbeat for anomaly detection / push routing. */
    lastSeenAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    /** Product-level unique string id (distinct from `_id`). */
    userId: { type: String, required: true, unique: true, index: true, trim: true },
    /** Optional login email captured post-OAuth/email flows. */
    email: { type: String, trim: true, lowercase: true },
    /** Preferred nickname for community surfaces. */
    username: { type: String, required: true, trim: true },
    /** Remote avatar once asset pipeline ships. */
    avatarUrl: { type: String, trim: true },
    /** Last engagement timestamp for retention analytics. */
    lastActiveAt: { type: Date, required: true, default: () => new Date() },
    /** Monetization + feature flag bundle. */
    subscription: {
      tier: { type: String, required: true, enum: SUBSCRIPTION_TIERS, default: "free" },
      expiresAt: { type: Date },
      autoRenew: { type: Boolean, required: true, default: false },
    },
    /** Reader chrome defaults editable from settings UI. */
    preferences: {
      theme: { type: String, required: true, enum: THEME_PREF, default: "system" },
      fontSize: { type: Number, required: true, default: 18, min: 12, max: 32 },
      fontFamily: { type: String, required: true, default: "serif" },
      bgmEnabled: { type: Boolean, required: true, default: true },
      aiVoice: { type: String, required: true, default: "default" },
      language: { type: String, required: true, enum: LANG_PREF, default: "zh" },
    },
    /** Multi-device roster for progress sync + abuse protection. */
    devices: { type: [deviceSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export type User = InferSchemaType<typeof userSchema>;

export const User: Model<User> =
  (mongoose.models.User as Model<User> | undefined) ??
  mongoose.model<User>("User", userSchema);

export { SUBSCRIPTION_TIERS, THEME_PREF, LANG_PREF };
