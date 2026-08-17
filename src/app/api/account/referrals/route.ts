import { json, requireUser } from "@/lib/api-guard";
import { User } from "@/lib/models/user";
import { publicUser } from "@/lib/users";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const referred = await User.find({ referredBy: auth.user._id }).sort({ createdAt: -1 });
  return json({
    code: auth.user.referralCode,
    count: referred.length,
    referred: referred.map(publicUser),
  });
}
