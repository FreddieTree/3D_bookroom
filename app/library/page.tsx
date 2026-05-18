import { BookshelfLayout } from "@/app/components/shelf/BookshelfLayout";

export default function LibraryPage() {
  return (
    <BookshelfLayout
      heading="完整书架"
      phaseNote="与首页书架共用占位布局（按需求暂时一致）。后续 Phase 将在这里扩展分类、搜索与云端同步。"
    />
  );
}
