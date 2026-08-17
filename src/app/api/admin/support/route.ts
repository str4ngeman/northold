import { json, requireAdmin } from "@/lib/api-guard";
import { Thread } from "@/lib/models/chat";
import { User } from "@/lib/models/user";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const threads = await Thread.find().sort({ lastMessageAt: -1 }).limit(200);
  const users = await User.find({ _id: { $in: threads.map((t) => t.userId) } });
  const map = new Map(users.map((u) => [u._id.toString(), u]));
  return json({
    threads: threads.map((t) => {
      const user = map.get(t.userId.toString());
      return {
        id: t._id.toString(),
        status: t.status,
        lastPreview: t.lastPreview,
        lastMessageAt: t.lastMessageAt,
        user: user
          ? { id: user._id.toString(), email: user.email, address: user.address, name: user.name }
          : null,
      };
    }),
  });
}
