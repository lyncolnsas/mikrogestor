import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mikrogestor SaaS - Gestão para ISPs",
  description: "ERP centralizado para provedores de internet com automação de rede.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mikrogestor",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617",
};

import { Toaster } from "sonner";

import { decrypt } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import "@/lib/init"; // Initialize system (VPN auto-registration, etc.)

// ... inside RootLayout
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookie = (await cookies()).get("session")?.value;
  const session = cookie ? await decrypt(cookie) : undefined;

  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          {children}
          <Toaster position="top-right" expand={true} richColors />
          <ImpersonationBanner isImpersonated={session?.isImpersonated} />
        </QueryProvider>
      </body>
    </html>
  );
}

