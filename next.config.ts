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
  workboxOptions: {
    navigateFallback: "/~offline",
    navigateFallbackDenylist: [
      /^\/_next\/image/,
      /^\/api(?:\/|$)/,
      /^\/_next\/data/,
    ],
  },
});

const nextConfig: NextConfig = {
  // Service worker & Workbox rely on Webpack. Turbopack dev still runs; production build uses Webpack when needed.
};

export default withPWA(nextConfig);
