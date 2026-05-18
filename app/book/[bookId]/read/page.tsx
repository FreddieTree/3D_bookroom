import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { ReaderShell } from "@/app/components/reader/ReaderShell";

type ReaderPageProps = {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ p?: string; chapter?: string; fromCover?: string }>;
};

export default async function ReaderPage({
  params,
  searchParams,
}: ReaderPageProps) {
  const { bookId } = await params;
  const sp = await searchParams;
  const openParagraphId = sp.p ?? null;
  let openChapterIndex: number | null = null;
  if (sp.chapter != null && sp.chapter !== "") {
    const n = Number.parseInt(sp.chapter, 10);
    if (Number.isFinite(n) && n >= 0) openChapterIndex = n;
  }
  const fromCover =
    sp.fromCover === "1" ||
    sp.fromCover === "true" ||
    sp.fromCover === "yes";

  return (
    <MobileContainer className="overflow-hidden">
      <ReaderShell
        bookId={bookId}
        openParagraphId={openParagraphId}
        openChapterIndex={openChapterIndex}
        fromCover={fromCover}
      />
    </MobileContainer>
  );
}
