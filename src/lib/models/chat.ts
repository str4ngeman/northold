import mongoose, { Schema } from "mongoose";

const threadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    lastMessageAt: { type: Date, default: Date.now },
    lastPreview: { type: String, default: "" },
  },
  { timestamps: true },
);

const messageSchema = new Schema(
  {
    threadId: { type: Schema.Types.ObjectId, ref: "Thread", required: true },
    sender: { type: String, enum: ["user", "admin"], required: true },
    body: { type: String, required: true },
  },
  { timestamps: true },
);

export const Thread = mongoose.models.Thread || mongoose.model("Thread", threadSchema);
export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
