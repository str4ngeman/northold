"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Suspense, useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { EasterEggs } from "@/components/easter-eggs";
import { ReferralCapture } from "@/components/referral-capture";
import { Toaster } from "@/components/ui/sonner";
import { CatalogProvider } from "@/hooks/use-catalog";
import { SessionProvider } from "@/hooks/use-session";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <CatalogProvider>
              <EasterEggs>
                <Suspense fallback={null}>
                  <ReferralCapture />
                </Suspense>
                {children}
                <Toaster position="top-center" />
              </EasterEggs>
            </CatalogProvider>
          </SessionProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
