export interface BookMeta {
  id: string;
  title: string;
  titleEn: string;
  author: string;
  coverColor: string;
  coverEmoji?: string;
  shortDesc: string;
  totalChapters: number;
  estimatedHours: number;
  isReady: boolean;
  progress: number;
  /** 对应 `sample_book/` 内文件名（可多条，便于辨认重复源文件）。 */
  sourceFiles?: string[];
}

/**
 * EPUB 文件名存于仓库 `sample_book/`。托尔斯泰《伊凡·伊里奇之死》因编码差异曾出现两条文件，
 * 书目中只保留一条（同一作品不重复上架）。
 */
export const SAMPLE_BOOK_DEDUPE_NOTE =
  "death-of-ivan-ilyich: 合并重复 epub（Толстой / Толстой 文件名变体）";

/** 首页「我的书屋」固定展示三本（演示） */
export const HOMEPAGE_SHELF_BOOK_IDS = [
  "little-prince",
  "nineteen-eighty-four",
  "the-old-man-and-the-sea",
] as const;

export const BOOKS: BookMeta[] = [
  {
    id: "little-prince",
    title: "小王子",
    titleEn: "The Little Prince",
    author: "安托万·德·圣-埃克苏佩里",
    coverColor:
      "color-mix(in oklch, var(--color-primary) 42%, var(--color-background))",
    coverEmoji: "🌹",
    shortDesc:
      "童话与哲理交织的星际旅程：孤独、驯养与玫瑰。当前上架试读含前三章中文内容。",
    totalChapters: 3,
    estimatedHours: 2,
    isReady: true,
    progress: 0.3,
    sourceFiles: [
      "小王子 (圣埃克苏佩里,Antoine de Saint-Exupery,马振骋) (z-library.sk, 1lib.sk, z-lib.sk).epub",
    ],
  },
  {
    id: "nineteen-eighty-four",
    title: "1984",
    titleEn: "Nineteen Eighty-Four",
    author: "乔治·奥威尔",
    coverColor:
      "color-mix(in oklch, oklch(from #2a3560 l c h) 38%, var(--color-background))",
    coverEmoji: "👁️",
    shortDesc: "监视、语言与新话：一页页逼近的寒意。书目为演示占位。",
    totalChapters: 3,
    estimatedHours: 8,
    isReady: true,
    progress: 0,
  },
  {
    id: "the-old-man-and-the-sea",
    title: "老人与海",
    titleEn: "The Old Man and the Sea",
    author: "欧内斯特·海明威",
    coverColor:
      "color-mix(in oklch, oklch(from #2f4f6f l c h) 42%, var(--surface-3))",
    coverEmoji: "🐟",
    shortDesc: "人与海的角力：疲惫、尊严与一句不肯认输的话。书目为演示占位。",
    totalChapters: 1,
    estimatedHours: 3,
    isReady: true,
    progress: 0.7,
  },
  {
    id: "aq-zhengzhuan",
    title: "阿Q正传",
    titleEn: "The True Story of Ah Q",
    author: "鲁迅",
    coverColor:
      "color-mix(in oklch, var(--color-accent) 34%, var(--color-background))",
    coverEmoji: "📜",
    shortDesc:
      "国民性解剖的经典短篇，冷峻锋利。整书解析与正文将随版本迭代持续补全。",
    totalChapters: 1,
    estimatedHours: 1,
    isReady: false,
    progress: 0,
    sourceFiles: [
      "阿Q正传 (鲁迅) (z-library.sk, 1lib.sk, z-lib.sk).epub",
    ],
  },
  {
    id: "village-teacher",
    title: "乡村教师",
    titleEn: "The Village Teacher",
    author: "刘慈欣",
    coverColor:
      "color-mix(in oklch, var(--color-destructive) 26%, var(--color-muted))",
    coverEmoji: "🌌",
    shortDesc: "科幻自选集名篇：渺小与广袤的对照。预处理完成后可沉浸式阅读。",
    totalChapters: 1,
    estimatedHours: 2,
    isReady: false,
    progress: 0,
    sourceFiles: [
      "乡村教师·刘慈欣科幻自选集 (刘慈欣) (z-library.sk, 1lib.sk, z-lib.sk).epub",
    ],
  },
  {
    id: "death-of-ivan-ilyich",
    title: "伊凡·伊里奇之死",
    titleEn: "The Death of Ivan Ilyich",
    author: "列夫·托尔斯泰",
    coverColor:
      "color-mix(in oklch, oklch(from #3d342b l c h) 22%, var(--color-muted))",
    coverEmoji: "🕯️",
    shortDesc: "死亡与生命意义的终极诘问。书目条目合并了目录中的重复文件。",
    totalChapters: 12,
    estimatedHours: 4,
    isReady: false,
    progress: 0,
    sourceFiles: [
      "伊凡・伊里奇之死 … 托尔斯泰 … (z-lib).epub [目录中曾存 2 份同书异编码文件名，已合并]",
    ],
  },
];

export function getBookById(id: string): BookMeta | undefined {
  return BOOKS.find((b) => b.id === id);
}

export function getHomepageShelfBooks(): BookMeta[] {
  const set = new Set<string>(HOMEPAGE_SHELF_BOOK_IDS);
  return BOOKS.filter((b) => set.has(b.id));
}
