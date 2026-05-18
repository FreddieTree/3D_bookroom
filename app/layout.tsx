import type { Metadata, Viewport } from "next";
import {
  Inter,
  Lora,
  Noto_Sans_SC,
  Noto_Serif_SC,
} from "next/font/google";

import { StoreHydration } from "@/app/components/providers/StoreHydration";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-sc",
  display: "swap",
});

const notoSerifSc = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-serif-sc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "三维书屋",
  description: "AI 沉浸式阅读伴侣",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "三维书屋",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "三维书屋",
    description: "AI 沉浸式阅读伴侣",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1611" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${lora.variable} ${notoSansSc.variable} ${notoSerifSc.variable} h-full`}
    >
      <body className="min-h-dvh">
        <StoreHydration>{children}</StoreHydration>
      </body>
    </html>
  );
}
