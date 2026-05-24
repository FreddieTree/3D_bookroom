"use client";

import type { ReactNode } from "react";

import { DirectorDock } from "@/app/components/demo/DirectorDock";
import { NetworkStatusBanner } from "@/app/components/network/NetworkStatusBanner";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <NetworkStatusBanner />
      <DirectorDock />
      {children}
    </>
  );
}
