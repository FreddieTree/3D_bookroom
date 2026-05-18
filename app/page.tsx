import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { HomeShelf } from "@/app/components/home/HomeShelf";

export default function Home() {
  return (
    <MobileContainer>
      <div className="px-6 sm:px-8">
        <HomeShelf />
      </div>
    </MobileContainer>
  );
}
