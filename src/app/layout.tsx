import type { Metadata, Viewport } from "next";

import { MotionPreferences } from "@/components/motion-preferences";
import { PwaRegister } from "@/components/pwa-register";
import { getMotionPreference } from "@/lib/session-cookies";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReadVault — Your Personal Digital Library",
  description: "A calm, personal space to organize and read your PDF books.",
  applicationName: "ReadVault",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ReadVault",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#315b45",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const reduceMotion = await getMotionPreference();

  return (
    <html lang="en">
      <body className={reduceMotion ? "reduce-motion" : undefined}>
        <MotionPreferences reduceMotion={reduceMotion}>
          {children}
        </MotionPreferences>
        <PwaRegister />
      </body>
    </html>
  );
}
