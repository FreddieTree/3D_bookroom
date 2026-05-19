import { DesignSystemShowcase } from "@/app/components/design-system/DesignSystemShowcase";
import { HomeShelf } from "@/app/components/home/HomeShelf";
import { MobileContainer } from "@/app/components/layout/MobileContainer";

export default function Home() {
  return (
    <MobileContainer>
      <div className="px-6 pb-8 sm:px-8">
        <HomeShelf />
        <DesignSystemShowcase />
      </div>
    </MobileContainer>
  );
}
