import { notFound } from "next/navigation";

import { ChapterCoverExperience } from "@/app/components/chapter/ChapterCoverExperience";
import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { getChaptersForBook } from "@/app/lib/data/sample-content";

type CoverPageProps = {
  params: Promise<{ bookId: string; chapterIndex: string }>;
};

export default async function ChapterCoverPage({ params }: CoverPageProps) {
  const { bookId, chapterIndex } = await params;
  const idx = Number.parseInt(chapterIndex, 10);
  if (!Number.isFinite(idx) || idx < 0) notFound();
  const chs = getChaptersForBook(bookId);
  if (!chs || idx >= chs.length) notFound();

  return (
    <MobileContainer className="overflow-hidden !bg-[#060608] !shadow-none">
      <ChapterCoverExperience bookId={bookId} chapterIndex={idx} />
    </MobileContainer>
  );
}
