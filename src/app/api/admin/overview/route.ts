import { json, requireAdmin } from "@/lib/api-guard";
import { Position } from "@/lib/models/position";
import { Thread } from "@/lib/models/chat";
import { User } from "@/lib/models/user";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const [users, positions, openThreads, admins] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Position.countDocuments(),
    Thread.countDocuments({ status: "open" }),
    User.countDocuments({ role: "admin" }),
  ]);
  return json({ users, positions, openThreads, admins });
}
