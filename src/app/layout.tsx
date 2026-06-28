import type { Metadata } from "next";
import "./globals.css";
import AlertEngine from "@/components/AlertEngine";

export const metadata: Metadata = {
  title: "Shortlist — asymmetric short-finder",
  description: "Find the best stocks to short. Risk a little, win big.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-950 text-ink-100 antialiased">
        <AlertEngine />
        {children}
      </body>
    </html>
  );
}
