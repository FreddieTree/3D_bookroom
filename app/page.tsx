import { BookshelfLayout } from "@/app/components/shelf/BookshelfLayout";

export default function Home() {
  return (
    <BookshelfLayout
      heading="书架"
      phaseNote="当前为导航骨架：书籍卡片、章节与正文将在 Phase 3+ 接入。你可以先沿演示路径走通全部占位页面。"
    />
  );
}
