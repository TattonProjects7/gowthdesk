import type { Metadata } from "next";
import "./globals.css";
import AlertEngine from "@/components/AlertEngine";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Shortlist — asymmetric short-finder",
  description: "Find the best stocks to short. Risk a little, win big.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-950 text-ink-100 antialiased">
        <AuthProvider>
          <AlertEngine />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
