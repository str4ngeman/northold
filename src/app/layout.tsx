import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter_Tight, JetBrains_Mono } from "next/font/google";

import { RootChrome } from "@/components/chrome";
import { Providers } from "@/components/providers";
import { BRAND } from "@/lib/brand";

import "./globals.css";

const body = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND.title,
  description: BRAND.description,
  applicationName: BRAND.name,
  metadataBase: new URL(`https://${BRAND.domain}`),
  openGraph: {
    title: BRAND.title,
    description: BRAND.description,
    siteName: BRAND.name,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${body.variable} ${mono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <RootChrome>{children}</RootChrome>
        </Providers>
        <div className="dust" aria-hidden />
      </body>
    </html>
  );
}
