import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { ReaderShell } from "@/app/components/reader/ReaderShell";

type ReaderPageProps = {
  params: Promise<{ bookId: string }>;
};

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { bookId } = await params;

  return (
    <MobileContainer className="overflow-hidden">
      <ReaderShell bookId={bookId} />
    </MobileContainer>
  );
}
