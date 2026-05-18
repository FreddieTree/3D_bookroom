import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { ReadingMapView } from "@/app/components/map/ReadingMapView";

type MapPageProps = {
  params: Promise<{ bookId: string }>;
};

export default async function MapPage({ params }: MapPageProps) {
  const { bookId } = await params;

  return (
    <div className="flex min-h-dvh justify-center bg-[#050506]">
      <MobileContainer className="border-transparent bg-[#0c0c0f] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
        <ReadingMapView bookId={bookId} />
      </MobileContainer>
    </div>
  );
}
