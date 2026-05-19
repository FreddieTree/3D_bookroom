import type { Metadata, Viewport } from "next";
import {
  Inter,
  Lora,
  Noto_Sans_SC,
  Noto_Serif_SC,
} from "next/font/google";

import { AppChrome } from "@/app/components/providers/AppChrome";
import { StoreHydration } from "@/app/components/providers/StoreHydration";
import { ThemeApplier } from "@/app/components/theme/ThemeApplier";

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
  ...(process.env.VERCEL_URL
    ? { metadataBase: new URL(`https://${process.env.VERCEL_URL}`) }
    : {}),
  applicationName: "三维书屋",
  title: {
    default: "三维书屋",
    template: "%s · 三维书屋",
  },
  description: "三维书屋 · 3D Bookroom · AI 沉浸式阅读伴侣",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "三维书屋",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "三维书屋",
    description: "三维书屋 · 3D Bookroom · AI 沉浸式阅读伴侣",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#b8763e",
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
      <head>
        <link
          rel="apple-touch-startup-image"
          href="/splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
      </head>
      <body className="min-h-dvh">
        <StoreHydration>
          <ThemeApplier />
          <AppChrome>{children}</AppChrome>
        </StoreHydration>
      </body>
    </html>
  );
}
