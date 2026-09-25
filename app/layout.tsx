import type { Metadata, Viewport } from "next";
import { ThemeController } from "@/components/theme-controller";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vidare – taxi when SL leaves you stranded",
  description: "Vidare orders and pays your taxi when SL traffic breaks down, and claims the cost from SL for you.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" },
  ],
};

/** Applies the saved theme before first paint to avoid a flash. */
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('vidare')||'{}').state||{};var t=s.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);if(s.lang)document.documentElement.lang=s.lang;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
