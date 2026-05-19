"use client";

import type { ReactNode } from "react";

import { DirectorDock } from "@/app/components/demo/DirectorDock";
import { GlobalSettingsModal } from "@/app/components/settings/GlobalSettingsModal";
import { NetworkStatusBanner } from "@/app/components/network/NetworkStatusBanner";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <NetworkStatusBanner />
      <GlobalSettingsModal />
      <DirectorDock />
      {children}
    </>
  );
}
