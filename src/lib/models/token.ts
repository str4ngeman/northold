import mongoose, { Schema } from "mongoose";

const tokenSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    decimals: { type: Number, required: true },
    priceUsd: { type: Number, required: true },
    color: { type: String, default: "#e2c36d" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Token = mongoose.models.Token || mongoose.model("Token", tokenSchema);
