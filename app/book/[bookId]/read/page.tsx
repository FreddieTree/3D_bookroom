import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { ReaderShell } from "@/app/components/reader/ReaderShell";

type ReaderPageProps = {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ p?: string }>;
};

export default async function ReaderPage({
  params,
  searchParams,
}: ReaderPageProps) {
  const { bookId } = await params;
  const sp = await searchParams;
  const openParagraphId = sp.p ?? null;

  return (
    <MobileContainer className="overflow-hidden">
      <ReaderShell bookId={bookId} openParagraphId={openParagraphId} />
    </MobileContainer>
  );
}
