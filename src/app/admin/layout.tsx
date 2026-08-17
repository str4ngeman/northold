"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/hooks/use-session";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/tokens", label: "Tokens" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/positions", label: "Positions" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "admin") router.replace("/app");
  }, [user, loading, router]);

  if (loading || user?.role !== "admin") {
    return <main className="page"><div className="container"><p className="label">Admin</p></div></main>;
  }

  return (
    <div className="admin">
      <aside className="admin__side">
        <Link href="/" className="nav__brand" style={{ marginBottom: "2rem" }}>
          Leagueto
        </Link>
        {LINKS.map((item) => (
          <Link key={item.href} href={item.href} data-active={pathname === item.href}>
            {item.label}
          </Link>
        ))}
        <Link href="/app" style={{ marginTop: "auto" }}>
          Back to app
        </Link>
      </aside>
      <div className="admin__main">{children}</div>
    </div>
  );
}
