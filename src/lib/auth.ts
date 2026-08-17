import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { BRAND } from "@/lib/brand";

export type SessionUser = {
  id: string;
  email?: string;
  address?: string;
  name?: string;
  role: "user" | "admin";
  referralCode: string;
};

const COOKIE = BRAND.cookies.session;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id ?? payload.sub),
      email: payload.email ? String(payload.email) : undefined,
      address: payload.address ? String(payload.address) : undefined,
      name: payload.name ? String(payload.name) : undefined,
      role: payload.role === "admin" ? "admin" : "user",
      referralCode: String(payload.referralCode ?? ""),
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

export function toSessionUser(doc: {
  _id: { toString(): string };
  email?: string | null;
  address?: string | null;
  name?: string | null;
  role: "user" | "admin";
  referralCode: string;
}): SessionUser {
  return {
    id: doc._id.toString(),
    email: doc.email ?? undefined,
    address: doc.address ?? undefined,
    name: doc.name ?? undefined,
    role: doc.role,
    referralCode: doc.referralCode,
  };
}
