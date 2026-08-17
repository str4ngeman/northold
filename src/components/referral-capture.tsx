"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ReferralCapture() {
  const params = useSearchParams();
  const code = params.get("ref");

  useEffect(() => {
    if (!code) return;
    void fetch("/api/auth/ref", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
  }, [code]);

  return null;
}
