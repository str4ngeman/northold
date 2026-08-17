import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, lowercase: true, sparse: true, unique: true },
    passwordHash: { type: String },
    address: { type: String, lowercase: true, sparse: true, unique: true },
    name: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    referralCode: { type: String, required: true, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    banned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type UserDoc = mongoose.InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
