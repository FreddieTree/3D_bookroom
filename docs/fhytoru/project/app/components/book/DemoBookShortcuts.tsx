import Link from "next/link";

/**
 * 仅 Demo 模式展示：评委/路演用快捷跳转，正式环境不渲染。
 */
export function DemoBookShortcuts({ bookId }: { bookId: string }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <nav className="font-sans mt-10 space-y-2 border-t border-border/60 pt-8 text-sm text-muted-foreground">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Demo · 快捷入口
      </p>
      <Link
        href={`/book/${bookId}/map`}
        prefetch
        className="block rounded-xl px-3 py-2 text-foreground transition-colors hover:bg-muted"
      >
        阅读地图
      </Link>
      <Link
        href={`/book/${bookId}/finished`}
        prefetch
        className="block rounded-xl px-3 py-2 text-foreground transition-colors hover:bg-muted"
      >
        读完庆祝页
      </Link>
    </nav>
  );
}
