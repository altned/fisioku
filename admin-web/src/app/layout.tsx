import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { AppShell } from "@/components/shell/app-shell";
import { AuthBoundary } from "@/components/auth/auth-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fisioku Admin",
  description: "Dashboard operasional Fisioku",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 text-slate-900 antialiased`}
      >
        <AppProviders>
          <AuthBoundary>
            <AppShell>{children}</AppShell>
          </AuthBoundary>
        </AppProviders>
      </body>
    </html>
  );
}
