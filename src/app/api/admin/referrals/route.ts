import { json, requireAdmin } from "@/lib/api-guard";
import { User } from "@/lib/models/user";
import { publicUser } from "@/lib/users";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const referred = await User.find({ referredBy: { $ne: null } }).sort({ createdAt: -1 });
  const referrers = await User.find({ _id: { $in: referred.map((u) => u.referredBy) } });
  const map = new Map(referrers.map((u) => [u._id.toString(), publicUser(u)]));
  return json({
    referrals: referred.map((u) => ({
      user: publicUser(u),
      referrer: u.referredBy ? map.get(String(u.referredBy)) ?? null : null,
    })),
  });
}
