import { NextRequest, NextResponse } from "next/server";

import { json, requireAdmin } from "@/lib/api-guard";
import { User } from "@/lib/models/user";
import { publicUser } from "@/lib/users";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await request.json();
  const user = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        ...(body.role ? { role: body.role } : {}),
        ...(typeof body.banned === "boolean" ? { banned: body.banned } : {}),
        ...(body.name ? { name: body.name } : {}),
      },
    },
    { new: true },
  );
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return json({ user: publicUser(user) });
}
