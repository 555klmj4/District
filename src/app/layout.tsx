import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { TRPCProvider } from "@/client/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "District",
  description: "Your personal restaurant intelligence system",
  manifest: "/manifest.json",
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
        <TRPCProvider>{children}</TRPCProvider>
        <Toaster theme="light" richColors position="top-center" />
      </body>
    </html>
  );
}
