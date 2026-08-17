import { NextRequest, NextResponse } from "next/server";

import { json, requireUser } from "@/lib/api-guard";
import { Message, Thread } from "@/lib/models/chat";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const thread = await Thread.findOne({ userId: auth.user._id });
  if (!thread) return json({ thread: null, messages: [] });
  const messages = await Message.find({ threadId: thread._id }).sort({ createdAt: 1 }).limit(200);
  return json({
    thread: { id: thread._id.toString(), status: thread.status },
    messages: messages.map((m) => ({
      id: m._id.toString(),
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = (await request.json()) as { body?: string };
  const text = body.body?.trim();
  if (!text) return NextResponse.json({ error: "Message required" }, { status: 400 });

  let thread = await Thread.findOne({ userId: auth.user._id });
  if (!thread) {
    thread = await Thread.create({
      userId: auth.user._id,
      status: "open",
      lastMessageAt: new Date(),
      lastPreview: text.slice(0, 120),
    });
  } else {
    thread.status = "open";
    thread.lastMessageAt = new Date();
    thread.lastPreview = text.slice(0, 120);
    await thread.save();
  }

  const message = await Message.create({
    threadId: thread._id,
    sender: "user",
    body: text,
  });

  return json({
    message: {
      id: message._id.toString(),
      sender: message.sender,
      body: message.body,
      createdAt: message.createdAt,
    },
  });
}
