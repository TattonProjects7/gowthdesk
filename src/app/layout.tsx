import type { Metadata, Viewport } from "next";
import "./globals.css";
import AlertEngine from "@/components/AlertEngine";
import AppLock from "@/components/AppLock";
import CloudSync from "@/components/CloudSync";
import Celebrations from "@/components/Celebrations";
import MissionEngine from "@/components/MissionEngine";
import { CoachProvider } from "@/components/coach/CoachProvider";
import NativeBridge from "@/components/NativeBridge";
import PortfolioEngine from "@/components/PortfolioEngine";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Shortlist — invest, trade and short with defined risk",
  description: "Learn to invest with £10,000 of practice money: UK and US shares, ETFs and crypto, bite-size lessons that pay practice cash, an AI coach, and the asymmetric short-finder.",
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
          <MissionEngine />
          <AppLock />
          <CoachProvider>
            {children}
            <Celebrations />
          </CoachProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
