import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { SettingsHub } from "@/app/components/settings/SettingsHub";

export default function SettingsPage() {
  return (
    <MobileContainer>
      <PageHeader title="设置" />
      <main className="mx-auto flex w-full flex-1 flex-col px-5 pb-10 pt-2 sm:px-7">
        <header className="mb-6 space-y-2">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            账户 · 用量 · 偏好
          </p>
          <h1 className="font-serif text-[1.65rem] font-semibold leading-tight text-foreground">
            设置
          </h1>
          <p className="font-sans text-sm text-muted-foreground">
            账户与用量为本地预览，接入服务端后将与真实套餐同步。
          </p>
        </header>

        <SettingsHub />
      </main>
    </MobileContainer>
  );
}
