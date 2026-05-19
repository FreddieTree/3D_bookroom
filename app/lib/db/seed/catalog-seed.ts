/**
 * Centralized ingestion for every `BOOKS[]` catalogue row plus rich demo artefacts.
 */

import { BOOKS } from "@/app/lib/data/books";
import {
  mongoCoverHex,
  mongoEstimatedParagraphs,
  mongoLanguage,
} from "@/app/lib/data/book-db-mapping";
import { type ChapterContent, getChaptersForBook } from "@/app/lib/data/sample-content";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { Bookmark } from "@/app/lib/db/models/bookmarks";
import { Book } from "@/app/lib/db/models/books";
import { Chapter } from "@/app/lib/db/models/chapters";
import { ChapterAsset } from "@/app/lib/db/models/chapterAssets";
import { CommunityShare } from "@/app/lib/db/models/communityShares";
import { Conversation } from "@/app/lib/db/models/conversations";
import { GeneratedContent } from "@/app/lib/db/models/generatedContents";
import { PendingQuestion } from "@/app/lib/db/models/pendingQuestions";
import { ReadingProgress } from "@/app/lib/db/models/readingProgress";
import { SpoilerMap } from "@/app/lib/db/models/spoilerMaps";
import { UsageLog } from "@/app/lib/db/models/usageLogs";
import { User } from "@/app/lib/db/models/users";
import { VisualStyle } from "@/app/lib/db/models/visualStyles";

type ChapterDraft = {
  bookId: string;
  index: number;
  title: string;
  subtitle?: string;
  paragraphs: {
    id: string;
    text: string;
    order: number;
    isKeyScene: boolean;
  }[];
  totalParagraphs: number;
  mood: string;
};

const SEED_BOOK_IDS = BOOKS.map((b) => b.id);

function splitSubtitle(title: string) {
  const parts = title.split(" · ").map((p) => p.trim());
  if (parts.length < 2)
    return { headline: title, subtitle: undefined as string | undefined };
  const [, ...rest] = parts;
  return { headline: parts[0], subtitle: rest.join(" · ") };
}

function paragraphsFromChapterContent(chapters: ChapterContent[], moods: string[]): ChapterDraft[] {
  return chapters.map((ch, ci) => {
    const mood = moods[Math.min(ci, moods.length - 1)]!;
    const { subtitle } = splitSubtitle(ch.title);
    return {
      bookId: ch.bookId,
      index: ch.index,
      title: ch.title,
      subtitle,
      paragraphs: ch.paragraphs.map((paragraph, idx) => ({
        id: paragraph.id,
        text: paragraph.text,
        order: idx,
        isKeyScene: idx === 4 || idx % 6 === 2,
      })),
      totalParagraphs: ch.paragraphs.length,
      mood,
    };
  });
}

function placeholderChapters(bookId: string, titleZh: string, author: string): ChapterDraft[] {
  return [
    {
      bookId,
      index: 0,
      title: `${titleZh} · 占位章节`,
      subtitle: "预处理 / 条目同步",
      paragraphs: [
        {
          id: `${bookId}-scaffold-001`,
          text: `《${titleZh}》条目来自本地 sample_book 目录元数据。\n正文切分仍由 ingestion 流水线处理 — 本条仅为数据库与书架 API 的一致性占位，便于团队提前联调。作者：${author}`,
          order: 0,
          isKeyScene: false,
        },
      ],
      totalParagraphs: 1,
      mood: "占位",
    },
  ];
}

function spoilerEntries(chapters: ChapterContent[]) {
  const flatParagraphRefs = chapters.flatMap((ch) =>
    ch.paragraphs.map((p, idx) => ({
      paragraphId: p.id,
      chapterHint: String(ch.index + 1),
      priority: idx,
    })),
  );
  return flatParagraphRefs.slice(0, 10).map((hint, ix) => {
    const spoilerLevel =
      ix % 3 === 0 ? ("major" as const) : ix % 3 === 1 ? ("minor" as const) : ("none" as const);
    const spoilerType =
      ix % 3 === 0 ? ("plot" as const) : ix % 3 === 1 ? ("character" as const) : ("ending" as const);
    return {
      paragraphId: hint.paragraphId,
      spoilerLevel,
      spoilerType,
      description:
        spoilerLevel === "major"
          ? "可能影响后续反转体验，暂不向首次阅读揭示。"
          : "人物动机提示，可按需解锁。",
      relatedTo:
        spoilerLevel === "major"
          ? [flatParagraphRefs[(ix + 1) % flatParagraphRefs.length]?.paragraphId ?? hint.paragraphId]
          : [],
    };
  });
}

export async function wipeSeedScope() {
  await Promise.all([
    User.deleteMany({ userId: DEFAULT_DEMO_USER_ID }),
    Book.deleteMany({ bookId: { $in: SEED_BOOK_IDS } }),
    Chapter.deleteMany({ bookId: { $in: SEED_BOOK_IDS } }),
    SpoilerMap.deleteMany({ bookId: { $in: SEED_BOOK_IDS } }),
    VisualStyle.deleteMany({ bookId: { $in: SEED_BOOK_IDS } }),
    ChapterAsset.deleteMany({ bookId: { $in: SEED_BOOK_IDS } }),
    PendingQuestion.deleteMany({
      userId: DEFAULT_DEMO_USER_ID,
      bookId: { $in: SEED_BOOK_IDS },
    }),
    ReadingProgress.deleteMany({
      userId: DEFAULT_DEMO_USER_ID,
      bookId: { $in: SEED_BOOK_IDS },
    }),
    Conversation.deleteMany({
      userId: DEFAULT_DEMO_USER_ID,
      bookId: { $in: SEED_BOOK_IDS },
    }),
    Bookmark.deleteMany({
      userId: DEFAULT_DEMO_USER_ID,
      bookId: { $in: SEED_BOOK_IDS },
    }),
    GeneratedContent.deleteMany({
      userId: DEFAULT_DEMO_USER_ID,
      bookId: { $in: SEED_BOOK_IDS },
    }),
    CommunityShare.deleteMany({
      userId: DEFAULT_DEMO_USER_ID,
      bookId: { $in: SEED_BOOK_IDS },
    }),
    UsageLog.deleteMany({ userId: DEFAULT_DEMO_USER_ID }),
  ]);
}

/** Insert catalogue rows mirrored from UI `BOOKS` array + scaffolding rows for EPUB stubs */
export async function ingestCatalogSeed() {
  console.info("[seed] upserting catalog books:", SEED_BOOK_IDS.join(", "));

  const moodsPrince = ["记忆沙岸", "星沙夜话", "幻旅叠影"];

  /** Single bulk insert minimises WAN roundtrips versus per-chapter create() loops */
  const chapterPayload: ChapterDraft[] = [];

  for (const meta of BOOKS) {
    const rich = getChaptersForBook(meta.id);
    const totalParasRich = rich
      ? rich.reduce((sum, ch) => sum + ch.paragraphs.length, 0)
      : mongoEstimatedParagraphs(meta);

    await Book.create({
      bookId: meta.id,
      title: meta.title,
      titleEn: meta.titleEn,
      author: meta.author,
      coverColor: mongoCoverHex(meta),
      coverEmoji: meta.coverEmoji ?? "📚",
      shortDesc: meta.shortDesc,
      longDesc: meta.sourceFiles?.length
        ? `离线样例文件：${meta.sourceFiles.join("；")}`
        : undefined,
      totalChapters: meta.totalChapters,
      totalParagraphs: meta.id === "little-prince" ? totalParasRich : mongoEstimatedParagraphs(meta),
      estimatedHours: meta.estimatedHours,
      language: mongoLanguage(meta),
      isReady: meta.isReady,
      status: meta.isReady ? "public" : "private",
      publishedYear: undefined,
      tags: ["三维书屋", meta.id, meta.isReady ? "ready" : "pipeline"],
    });

    if (rich?.length) {
      chapterPayload.push(...paragraphsFromChapterContent(rich, moodsPrince));
      await SpoilerMap.create({
        bookId: meta.id,
        version: 1,
        entries: spoilerEntries(rich),
        generatedBy: "demo-seed@bookroom:v2",
      });
      await VisualStyle.create({
        bookId: meta.id,
        name: `${meta.title} · Art Bible`,
        illustrationPromptTemplate:
          "Watercolor gouache dusk sky, luminous stars, tactile paper fibers, restrained grain.",
        cinematographyNotes:
          "Slow dolly pushes, volumetric amber haze, restrained motion blur.",
        paletteAnchorHex: mongoCoverHex(meta),
        moodKeywords: ["nostalgic", meta.id],
        referenceImageUrls: [`https://example.com/refs/${meta.id}-moodboard.png`],
        isActive: true,
      });

      await ChapterAsset.insertMany(
        rich.map((ch) => ({
          bookId: meta.id,
          chapterIndex: ch.index,
          assetSlot: "hero" as const,
          assetUrl: `https://example.com/generated/${meta.id}/hero-chapter-${ch.index + 1}.webp`,
          technicalMeta: { mimeType: "image/webp" },
          generationTraceId: `demo-hero-${meta.id}-${ch.index}`,
        })),
      );
    } else {
      chapterPayload.push(...placeholderChapters(meta.id, meta.title, meta.author));
      await SpoilerMap.create({
        bookId: meta.id,
        version: 1,
        entries: [],
        generatedBy: `${meta.id}-stub`,
      });
      await VisualStyle.create({
        bookId: meta.id,
        name: `${meta.title} · Scaffold Style`,
        illustrationPromptTemplate:
          "Neutral paper scaffold, subdued palette until EPUB ingestion completes.",
        cinematographyNotes: "Static tableau, typography-safe.",
        paletteAnchorHex: mongoCoverHex(meta),
        moodKeywords: ["stub", meta.id],
        referenceImageUrls: [],
        isActive: true,
      });
      await ChapterAsset.create({
        bookId: meta.id,
        chapterIndex: 0,
        assetSlot: "hero" as const,
        assetUrl: `https://example.com/generated/${meta.id}/hero-placeholder.webp`,
        technicalMeta: { mimeType: "image/webp" },
        generationTraceId: `demo-placeholder-${meta.id}`,
      });
    }
  }

  await Chapter.insertMany(chapterPayload);
  console.info(
    "[seed] bulk inserted chapters rows=%d (includes placeholders for EPUB stubs).",
    chapterPayload.length,
  );
}

export async function seedDemoUserLayer() {
  await User.create({
    userId: DEFAULT_DEMO_USER_ID,
    email: undefined,
    username: "共读演示用户",
    avatarUrl: undefined,
    subscription: {
      tier: "reader",
      expiresAt: undefined,
      autoRenew: false,
    },
    preferences: {
      theme: "system",
      fontSize: 18,
      fontFamily: "serif",
      bgmEnabled: true,
      aiVoice: "default",
      language: "zh",
    },
    devices: [{ deviceId: "seed-browser", deviceName: "Seed · Chromium", lastSeenAt: new Date() }],
  });

  const littleChapters = getChaptersForBook("little-prince");
  const flatParas = littleChapters?.flatMap((c) => c.paragraphs) ?? [];
  const firstParagraph = flatParas[0];
  const tenthParagraph = flatParas[9];

  await ReadingProgress.create({
    userId: DEFAULT_DEMO_USER_ID,
    bookId: "little-prince",
    chapterIndex: 0,
    paragraphId: firstParagraph?.id ?? "unknown",
    syncVersion: 1,
    deviceId: "seed-device",
    percentComplete:
      flatParas.length > 0
        ? Math.min(100, Math.round((1 / flatParas.length) * 100))
        : undefined,
  });

  await PendingQuestion.create({
    userId: DEFAULT_DEMO_USER_ID,
    bookId: "little-prince",
    question: "玫瑰到底是不是唯一的？",
    expectedReleaseParagraphId: tenthParagraph?.id ?? firstParagraph?.id ?? "unknown-p",
    status: "queued",
    answer: undefined,
  });

  await GeneratedContent.create({
    userId: DEFAULT_DEMO_USER_ID,
    bookId: "little-prince",
    chapterIndex: 0,
    paragraphId: littleChapters?.[0]?.paragraphs[2]?.id,
    kind: "image",
    assetUrl: "https://example.com/generated/little-prince/inline-p2.png",
    prompt: "温柔星光下的撒哈拉沙丘 + 纸片飞机轮廓",
    providerMeta: {
      model: "image-01-mock",
      tokenIn: 120,
      tokenOut: 0,
      latencyMs: 820,
    },
  });

  await Bookmark.create({
    userId: DEFAULT_DEMO_USER_ID,
    bookId: "little-prince",
    paragraphId: littleChapters?.[1]?.paragraphs[3]?.id ?? firstParagraph?.id ?? "unknown-p",
    note: "这里提到驯养与时间，很适合做情绪音乐拐点。",
    excerpt: littleChapters?.[1]?.paragraphs[3]?.text.slice(0, 120),
  });

  await CommunityShare.create({
    userId: DEFAULT_DEMO_USER_ID,
    bookId: "little-prince",
    slug: "little-prince-desert-evening-demo",
    title: "把星空折进纸页的晚上",
    excerpt:
      "共读样本：分享我在三维书屋沉浸式阅读器中截取的沙丘配色与情绪曲线。（数据库自动种子）",
    previewImageUrl: "https://example.com/community/little-prince/share-cover.png",
    visibility: "public",
    stats: { likes: 18, impressions: 420 },
    isFeatured: true,
  });

  await UsageLog.insertMany([
    {
      userId: DEFAULT_DEMO_USER_ID,
      action: "chat.prompt",
      model: "m2-mock",
      tokenIn: 560,
      tokenOut: 180,
      meta: { latencyMs: 640 },
      recordedAt: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      userId: DEFAULT_DEMO_USER_ID,
      action: "image.generate",
      model: "image-01-mock",
      tokenIn: 420,
      tokenOut: 0,
      meta: { latencyMs: 2100 },
      recordedAt: new Date(),
    },
  ]);
}

export { SEED_BOOK_IDS };
