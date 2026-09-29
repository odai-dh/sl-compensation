import type { Metadata } from "next";
import localFont from "next/font/local";

// Unbounded + Inter (both SIL OFL 1.1, from Google Fonts), self-hosted via Fontsource so the site builds
// and runs with no network – useful on venue wifi.
const display = localFont({
  src: [
    { path: "../../node_modules/@fontsource/unbounded/files/unbounded-latin-700-normal.woff2", weight: "700" },
    { path: "../../node_modules/@fontsource/unbounded/files/unbounded-latin-800-normal.woff2", weight: "800" },
  ],
  variable: "--font-display",
  display: "swap",
});
const text = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-text",
  display: "swap",
});

/**
 * Absolute base for the share image. NEXT_PUBLIC_SITE_URL wins; otherwise Netlify's own build variables
 * (URL = primary domain, DEPLOY_PRIME_URL = this deploy or preview), then localhost.
 */
function siteUrl(): string {
  const env = process.env;
  const netlify = env.CONTEXT === "production" ? env.URL : (env.DEPLOY_PRIME_URL ?? env.URL);
  return env.NEXT_PUBLIC_SITE_URL ?? netlify ?? "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Vidare – when SL stops, you still get home",
  description:
    "When SL traffic breaks down, Vidare orders and pays your taxi, then claims the cost from SL under a BankID power of attorney. You pay nothing.",
  openGraph: {
    title: "Vidare – when SL stops, you still get home",
    description: "Vidare orders and pays your taxi when SL breaks down, and gets SL to pay it back.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Night-time Stockholm with a commuter train on an elevated track, and the headline “17:42. On your way home.”" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${text.variable}`}>{children}</div>;
}
