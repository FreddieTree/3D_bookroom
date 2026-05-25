import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  cacheStartUrl: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/~offline",
  },
  /** 不在线时保留兜底页；不向所有失败导航全局注入离线 HTML，减少 iOS PWA 误判。 */
  workboxOptions: {
    navigateFallbackDenylist: [
      /^\/_next\/image/,
      /^\/api(?:\/|$)/,
      /^\/_next\/data/,
      /^\/~offline$/,
      /^\/offline$/,
    ],
  },
});

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  turbopack: {},
  outputFileTracingRoot: __dirname,
};

export default withPWA(nextConfig);
