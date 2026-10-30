import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowthDesk",
  description: "AI SEO & content engine for your businesses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
