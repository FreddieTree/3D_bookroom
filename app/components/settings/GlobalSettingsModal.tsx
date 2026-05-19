"use client";

import { SideModal } from "@/app/components/ui/SideModal";
import { SettingsHub } from "@/app/components/settings/SettingsHub";
import { useOverlayHistoryBinding } from "@/app/lib/hooks/useOverlayHistory";
import { useAppStore } from "@/app/lib/stores/appStore";

export function GlobalSettingsModal() {
  const open = useAppStore((s) => s.isGlobalSettingsOpen);
  const closeGlobalSettings = useAppStore((s) => s.closeGlobalSettings);

  useOverlayHistoryBinding(open, closeGlobalSettings, "app.global-settings");

  return (
    <SideModal
      open={open}
      onClose={closeGlobalSettings}
      side="right"
      title="设置"
      panelClassName="max-h-dvh overflow-hidden pt-0"
    >
      <div className="px-5 pb-10 pt-1 sm:px-7">
        <header className="mb-4 space-y-1">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            账户 · 用量 · 偏好
          </p>
          <p className="font-sans text-sm text-muted-foreground">
            账户与用量为本地预览，接入服务端后将与真实套餐同步。
          </p>
        </header>
        <SettingsHub />
      </div>
    </SideModal>
  );
}
