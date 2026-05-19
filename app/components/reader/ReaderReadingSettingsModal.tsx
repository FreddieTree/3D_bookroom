"use client";

import { X } from "lucide-react";

import { ReaderSettingsPanel } from "@/app/components/reader/ReaderSettingsPanel";
import { SideModal } from "@/app/components/ui/SideModal";
import { spring } from "@/app/lib/animations";
import { useOverlayHistoryBinding } from "@/app/lib/hooks/useOverlayHistory";

type ReaderReadingSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  fontSizeOptions: readonly number[];
};

export function ReaderReadingSettingsModal({
  open,
  onClose,
  fontSizeOptions,
}: ReaderReadingSettingsModalProps) {
  useOverlayHistoryBinding(open, onClose, "reader.settings");

  return (
    <SideModal
      customHeader
      nestedLayout
      open={open}
      onClose={onClose}
      side="right"
      transition={spring.soft}
      panelClassName="max-h-[100dvh] w-[min(100vw,_24rem)] border-l border-border"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-center border-b border-border px-4 pb-3 pt-[max(0.65rem,env(safe-area-inset-top))]">
          <h2 className="text-sm font-semibold text-foreground">阅读设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
            aria-label="关闭"
          >
            <X className="size-5 stroke-[1.75]" />
          </button>
        </header>
        <ReaderSettingsPanel
          fontSizeOptions={fontSizeOptions}
          persistMode="draft"
          onRequestClose={onClose}
        />
      </div>
    </SideModal>
  );
}
