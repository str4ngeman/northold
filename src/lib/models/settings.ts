import mongoose, { Schema } from "mongoose";

const settingsSchema = new Schema(
  {
    key: { type: String, unique: true, default: "app" },
    siteName: { type: String, default: "Leagueto" },
    tagline: { type: String, default: "The card is the stake." },
    rewardSymbol: { type: String, default: "USDT" },
    referralBps: { type: Number, default: 500 },
    supportEnabled: { type: Boolean, default: true },
    nextTokenId: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);
