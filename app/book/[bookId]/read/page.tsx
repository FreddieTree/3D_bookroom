import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { ReaderShell } from "@/app/components/reader/ReaderShell";
import { mapDbBookToBookMeta } from "@/app/lib/catalog/map-book-meta";
import { getBookById } from "@/app/lib/data/books";
import { USE_REAL_DB } from "@/app/lib/data-source";
import { connectDB } from "@/app/lib/db/mongodb";
import { getBookById as getBookMongo } from "@/app/lib/db/repositories/bookRepository";

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

  let bookMeta = getBookById(bookId);

  if (USE_REAL_DB) {
    try {
      await connectDB();
      const doc = await getBookMongo(bookId);
      if (doc) bookMeta = mapDbBookToBookMeta(doc as never);
    } catch {
      /* 保留静态书目 */
    }
  }

  return (
    <MobileContainer className="overflow-hidden">
      <ReaderShell
        bookId={bookId}
        bookMeta={bookMeta}
        openParagraphId={openParagraphId}
        openChapterIndex={openChapterIndex}
        fromCover={fromCover}
      />
    </MobileContainer>
  );
}
