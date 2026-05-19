import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EduPlay — Educational Mini Games",
  description: "Platform mini game edukatif untuk pelajar SD hingga SMA",
  manifest: "/manifest.json",
  themeColor: "#4F46E5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
