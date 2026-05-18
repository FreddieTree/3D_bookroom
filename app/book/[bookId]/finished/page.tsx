import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { BookFinishedExperience } from "@/app/components/book/BookFinishedExperience";

type FinishedPageProps = {
  params: Promise<{ bookId: string }>;
};

export default async function FinishedPage({ params }: FinishedPageProps) {
  const { bookId } = await params;

  return (
    <MobileContainer className="overflow-x-hidden">
      <BookFinishedExperience bookId={bookId} />
    </MobileContainer>
  );
}
