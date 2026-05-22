import { notFound } from "next/navigation";

import { ChapterCoverExperience } from "@/app/components/chapter/ChapterCoverExperience";
import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { loadBodyChaptersForBook } from "@/app/lib/db/loadMergedChaptersForBook";

type CoverPageProps = {
  params: Promise<{ bookId: string; chapterIndex: string }>;
};

export default async function ChapterCoverPage({ params }: CoverPageProps) {
  const { bookId, chapterIndex } = await params;
  const idx = Number.parseInt(chapterIndex, 10);
  if (!Number.isFinite(idx) || idx < 0) notFound();

  const chapters = await loadBodyChaptersForBook(bookId);
  if (!chapters.length || idx >= chapters.length) notFound();

  const resolvedTitle = chapters[idx]!.title;

  return (
    <MobileContainer className="flex min-h-dvh flex-1 flex-col overflow-x-hidden !bg-[#060608] !shadow-none">
      <ChapterCoverExperience
        bookId={bookId}
        chapterIndex={idx}
        chapterTitleFromDb={resolvedTitle}
      />
    </MobileContainer>
  );
}
