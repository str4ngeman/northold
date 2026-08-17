import { cookies } from "next/headers";

import { User } from "@/lib/models/user";

export async function findReferrer(code?: string | null) {
  const fromCookie = (await cookies()).get("leagueto_ref")?.value?.trim();
  const value = (code || fromCookie)?.trim().toLowerCase();
  if (!value) return null;
  return User.findOne({ referralCode: value });
}

export function publicUser(user: {
  _id: { toString(): string };
  email?: string | null;
  address?: string | null;
  name?: string | null;
  role: string;
  referralCode: string;
  referredBy?: { toString(): string } | null;
  banned?: boolean;
  createdAt?: Date;
}) {
  return {
    id: user._id.toString(),
    email: user.email ?? null,
    address: user.address ?? null,
    name: user.name ?? null,
    role: user.role,
    referralCode: user.referralCode,
    referredBy: user.referredBy ? String(user.referredBy) : null,
    banned: Boolean(user.banned),
    createdAt: user.createdAt ?? null,
  };
}
