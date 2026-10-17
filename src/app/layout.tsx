import type { Metadata, Viewport } from "next";
import "./globals.css";
import AlertEngine from "@/components/AlertEngine";
import AppLock from "@/components/AppLock";
import CloudSync from "@/components/CloudSync";
import NativeBridge from "@/components/NativeBridge";
import PortfolioEngine from "@/components/PortfolioEngine";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Shortlist — invest, trade and short with defined risk",
  description: "UK shares, US stocks, ETFs and crypto in one app: portfolio, watchlists, price alerts, savings plans, look-through analytics and the asymmetric short-finder.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Shortlist", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0d0f1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-950 text-ink-100 antialiased">
        <AuthProvider>
          <NativeBridge />
          <CloudSync />
          <AlertEngine />
          <PortfolioEngine />
          <AppLock />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
