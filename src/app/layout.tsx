import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReadVault — Your Personal Digital Library",
  description: "A calm, personal space to organize and read your PDF books.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
