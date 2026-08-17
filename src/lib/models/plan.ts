import mongoose, { Schema } from "mongoose";

const planSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    tagline: { type: String, default: "" },
    lockSeconds: { type: Number, required: true },
    minUsd: { type: Number, required: true },
    maxUsd: { type: Number, required: true },
    apyBps: { type: Number, required: true },
    emergencyFeeBps: { type: Number, required: true },
    active: { type: Boolean, default: true },
    onChainId: { type: Number },
  },
  { timestamps: true },
);

if (mongoose.models.Plan && !mongoose.models.Plan.schema.path("onChainId")) {
  mongoose.deleteModel("Plan");
}

export const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);
