import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { TRPCProvider } from "@/client/providers";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "District",
  description: "Your personal restaurant intelligence system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "District",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground font-sans">
        <OfflineBanner />
        <NavigationProgress />
        <TRPCProvider><I18nProvider>{children}</I18nProvider></TRPCProvider>
        <Toaster theme="light" richColors position="top-center" />
      </body>
    </html>
  );
}
