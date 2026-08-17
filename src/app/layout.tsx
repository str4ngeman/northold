import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { KineticShell } from "@/components/kinetic/kinetic-shell";
import { Providers } from "@/components/providers";

import "./globals.css";
import "./kinetic.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leagueto — Vault Cards",
  description:
    "An ERC-20 lock mints a numbered NFT. USDT accrues on the face. Principal returns in the same tokens when the seal completes.",
};

export const viewport: Viewport = {
  themeColor: "#07070c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>
          <KineticShell>{children}</KineticShell>
        </Providers>
      </body>
    </html>
  );
}
