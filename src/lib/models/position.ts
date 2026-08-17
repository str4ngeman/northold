import mongoose, { Schema } from "mongoose";

const positionSchema = new Schema(
  {
    tokenId: { type: Number, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: String, required: true, lowercase: true },
    assetId: { type: String, required: true },
    principalAmount: { type: Number, required: true },
    planId: { type: String, required: true },
    startedAt: { type: Number, required: true },
    rarity: { type: String, required: true },
    sizeTier: { type: String, required: true },
    claimedUsdt: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["locked", "matured", "unlocked", "emergencyExited"],
      default: "locked",
    },
    unlockedAt: { type: Number },
  },
  { timestamps: true },
);

export const Position = mongoose.models.Position || mongoose.model("Position", positionSchema);
