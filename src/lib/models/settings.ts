import mongoose, { Schema } from "mongoose";

import { BRAND } from "@/lib/brand";

const settingsSchema = new Schema(
  {
    key: { type: String, unique: true, default: "app" },
    siteName: { type: String, default: BRAND.name },
    tagline: { type: String, default: BRAND.tagline },
    rewardSymbol: { type: String, default: "asset" },
    referralBps: { type: Number, default: 500 },
    supportEnabled: { type: Boolean, default: true },
    nextTokenId: { type: Number, default: 1 },
    activeNetwork: { type: String, enum: ["sepolia", "mainnet"], default: "sepolia" },
    networks: { type: Schema.Types.Mixed, default: {} },
    chainId: { type: Number },
    rpcUrl: { type: String },
    vaultAddress: { type: String },
    cardAddress: { type: String },
    oracleAddress: { type: String },
    lensAddress: { type: String },
    deployerAddress: { type: String },
    protocolPlans: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

if (mongoose.models.Settings && !mongoose.models.Settings.schema.path("activeNetwork")) {
  mongoose.deleteModel("Settings");
}

export const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);
