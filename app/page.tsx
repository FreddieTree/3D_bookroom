import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { HomeHero } from "@/app/components/home/HomeHero";
import { HomeShelf } from "@/app/components/home/HomeShelf";

export default function Home() {
  return (
    <MobileContainer>
      <div className="px-6 sm:px-8 pb-16">
        <HomeHero />
        <HomeShelf />
      </div>
    </MobileContainer>
  );
}
