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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Vidare – when SL stops, you still get home",
  description:
    "A hackathon concept: when SL traffic breaks down, Vidare orders and pays your taxi, then claims the cost from SL under a BankID power of attorney. You pay nothing.",
  openGraph: {
    title: "Vidare – when SL stops, you still get home",
    description: "Vidare orders and pays your taxi when SL breaks down, and gets SL to pay it back.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "A stylised night-time Stockholm with a stopped commuter train and a taxi under a streetlight" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${text.variable}`}>{children}</div>;
}
