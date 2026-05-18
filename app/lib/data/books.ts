export interface BookMeta {
  id: string;
  title: string;
  titleEn: string;
  author: string;
  /** Solid / mixed CSS color for placeholder cover (theme-aware). */
  coverColor: string;
  coverEmoji?: string;
  shortDesc: string;
  totalChapters: number;
  estimatedHours: number;
  isReady: boolean;
  /** 0–1 reading progress */
  progress: number;
}

export const BOOKS: BookMeta[] = [
  {
    id: "little-prince",
    title: "小王子",
    titleEn: "The Little Prince",
    author: "安东尼·德·圣-埃克苏佩里",
    coverColor:
      "color-mix(in oklch, var(--color-primary) 42%, var(--color-background))",
    coverEmoji: "🌹",
    shortDesc:
      "一部写给成年人的童话：关于孤独、驯养与真心，在星星与玫瑰之间找到属于你的一朵花。",
    totalChapters: 27,
    estimatedHours: 2,
    isReady: true,
    progress: 0.3,
  },
  {
    id: "1984",
    title: "1984",
    titleEn: "Nineteen Eighty-Four",
    author: "乔治·奥威尔",
    coverColor:
      "color-mix(in oklch, var(--color-accent) 38%, var(--color-background))",
    coverEmoji: "👁️",
    shortDesc:
      "老大哥在看着你。一部关于真理、语言与权力的警世寓言，冷峻而灼热。",
    totalChapters: 24,
    estimatedHours: 8,
    isReady: false,
    progress: 0,
  },
  {
    id: "old-man-sea",
    title: "老人与海",
    titleEn: "The Old Man and the Sea",
    author: "欧内斯特·海明威",
    coverColor:
      "color-mix(in oklch, var(--color-destructive) 32%, var(--color-muted))",
    coverEmoji: "🎣",
    shortDesc:
      "人可以被打败，但不能被摧毁。大海、马林鱼与狮子，写在骨头里的尊严。",
    totalChapters: 12,
    estimatedHours: 3,
    isReady: false,
    progress: 0,
  },
];

export function getBookById(id: string): BookMeta | undefined {
  return BOOKS.find((b) => b.id === id);
}
