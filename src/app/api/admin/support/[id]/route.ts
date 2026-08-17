import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import { Message, Thread } from "@/lib/models/chat";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const thread = await Thread.findById(id);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const messages = await Message.find({ threadId: thread._id }).sort({ createdAt: 1 });
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

export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = (await request.json()) as { body?: string; status?: string };
  const thread = await Thread.findById(id);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status === "closed" || body.status === "open") {
    thread.status = body.status;
    await thread.save();
  }

  if (body.body?.trim()) {
    const text = body.body.trim();
    const message = await Message.create({ threadId: thread._id, sender: "admin", body: text });
    thread.lastMessageAt = new Date();
    thread.lastPreview = text.slice(0, 120);
    thread.status = "open";
    await thread.save();
    return json({
      message: {
        id: message._id.toString(),
        sender: message.sender,
        body: message.body,
        createdAt: message.createdAt,
      },
    });
  }

  return json({ ok: true });
}
