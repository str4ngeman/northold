import mongoose, { Schema } from "mongoose";

const nonceSchema = new Schema(
  {
    value: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

nonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthNonce = mongoose.models.AuthNonce || mongoose.model("AuthNonce", nonceSchema);
