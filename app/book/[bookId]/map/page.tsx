import Link from "next/link";

import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { PhaseBlurb } from "@/app/components/shelf/PhaseBlurb";

type MapPageProps = {
  params: Promise<{ bookId: string }>;
};

export default async function MapPage({ params }: MapPageProps) {
  const { bookId } = await params;

  return (
    <MobileContainer>
      <PageHeader
        title="阅读地图"
        right={
          <Link
            href={`/book/${bookId}/read`}
            className="font-sans rounded-lg px-3 py-2 text-xs font-semibold text-accent hover:bg-muted"
          >
            阅读
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-10 pt-2 sm:px-8">
        <main className="flex min-h-0 flex-1 flex-col justify-center space-y-8">
          <header className="space-y-3">
            <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              结构总览 · 预留全屏画布
            </p>
            <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground">
              阅读地图（占位）
            </h1>
            <p className="font-sans text-sm text-muted-foreground">
              此区域未来将承载章节节点、时间线与可缩放视图。
            </p>
          </header>
          <PhaseBlurb>
            Phase 5：图布局、人物/情节节点与跳转回正文锚点。右上角「阅读」回到阅读器。
          </PhaseBlurb>
        </main>
      </div>
    </MobileContainer>
  );
}
