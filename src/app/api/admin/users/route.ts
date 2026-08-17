import { json, requireAdmin } from "@/lib/api-guard";
import { User } from "@/lib/models/user";
import { publicUser } from "@/lib/users";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const users = await User.find().sort({ createdAt: -1 }).limit(500);
  return json({ users: users.map(publicUser) });
}
