import { MobileContainer } from "@/app/components/layout/MobileContainer";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { LibraryGrid } from "@/app/components/library/LibraryGrid";

export default function LibraryPage() {
  return (
    <MobileContainer>
      <div className="px-6 sm:px-8">
        <PageHeader title="完整书架" backHref="/" />
        <LibraryGrid />
      </div>
    </MobileContainer>
  );
}
