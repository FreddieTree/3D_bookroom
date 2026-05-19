/**
 * Canonical bootstrap script for teammate onboarding + Atlas sanity checks.
 *
 * Run locally with `npm run db:seed` after `.env.local` contains Atlas creds.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";

import { getChaptersForBook } from "@/app/lib/data/sample-content";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { connectDB } from "@/app/lib/db/mongodb";
import { Bookmark } from "@/app/lib/db/models/bookmarks";
import { Chapter } from "@/app/lib/db/models/chapters";
import { ChapterAsset } from "@/app/lib/db/models/chapterAssets";
import { CommunityShare } from "@/app/lib/db/models/communityShares";
import { Conversation } from "@/app/lib/db/models/conversations";
import { GeneratedContent } from "@/app/lib/db/models/generatedContents";
import { Book } from "@/app/lib/db/models/books";
import { PendingQuestion } from "@/app/lib/db/models/pendingQuestions";
import { ReadingProgress } from "@/app/lib/db/models/readingProgress";
import { SpoilerMap } from "@/app/lib/db/models/spoilerMaps";
import { UsageLog } from "@/app/lib/db/models/usageLogs";
import { User } from "@/app/lib/db/models/users";
import { VisualStyle } from "@/app/lib/db/models/visualStyles";

const BOOK_ID = "little-prince";

const envLocalPath = path.resolve(process.cwd(), ".env.local");

if (!process.env.MONGODB_URI?.trim()) {
  if (existsSync(envLocalPath)) {
    loadDotenv({ path: envLocalPath, override: true });
    console.info("[seed] loaded environment from .env.local");
  } else {
    loadDotenv();
  }
}

function splitSubtitle(title: string) {
  const parts = title.split(" · ").map((p) => p.trim());
  if (parts.length < 2) return { headline: title, subtitle: undefined as string | undefined };
  const [chapterLabel, subtitle] = [parts[0], parts.slice(1).join(" · ")];
  return { headline: chapterLabel!, subtitle };
}

async function wipeScopedData() {
  await Promise.all([
    User.deleteMany({ userId: DEFAULT_DEMO_USER_ID }),
    Book.deleteMany({ bookId: BOOK_ID }),
    Chapter.deleteMany({ bookId: BOOK_ID }),
    SpoilerMap.deleteMany({ bookId: BOOK_ID }),
    VisualStyle.deleteMany({ bookId: BOOK_ID }),
    ChapterAsset.deleteMany({ bookId: BOOK_ID }),
    PendingQuestion.deleteMany({ userId: DEFAULT_DEMO_USER_ID, bookId: BOOK_ID }),
    ReadingProgress.deleteMany({ userId: DEFAULT_DEMO_USER_ID, bookId: BOOK_ID }),
    Conversation.deleteMany({ userId: DEFAULT_DEMO_USER_ID, bookId: BOOK_ID }),
    Bookmark.deleteMany({ userId: DEFAULT_DEMO_USER_ID, bookId: BOOK_ID }),
    GeneratedContent.deleteMany({ userId: DEFAULT_DEMO_USER_ID, bookId: BOOK_ID }),
    CommunityShare.deleteMany({ userId: DEFAULT_DEMO_USER_ID, bookId: BOOK_ID }),
    UsageLog.deleteMany({ userId: DEFAULT_DEMO_USER_ID }),
  ]);
}

async function seed() {
  await connectDB();
  console.info("[seed] wiping scoped demos…");
  await wipeScopedData();

  const chapters = getChaptersForBook(BOOK_ID);
  if (!chapters) {
    throw new Error("[seed] sample chapters missing — verify sample-content loader.");
  }

  const moods = ["记忆沙岸", "星沙夜话", "幻旅叠影"];
  let totalParas = 0;

  await Book.create({
    bookId: BOOK_ID,
    title: "小王子 · 共读演示",
    titleEn: "The Little Prince (demo scaffold)",
    author: "安托万·德·圣-埃克苏佩里",
    coverColor: "#b8763e",
    coverEmoji: "🌹",
    shortDesc:
      "公梗概式共读样本，专为三维书屋沉浸式 UI 与设计系统离线演示而建（并非逐句转载任意译本）。",
    longDesc:
      "团队在黑客松阶段的叙事骨架数据集，段落经过中文重写以规避版权片段，占位多媒体字段待接入 teammate 管线。",
    totalChapters: chapters.length,
    totalParagraphs: chapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0),
    estimatedHours: 1.35,
    language: "bilingual",
    isReady: true,
    status: "public",
    publishedYear: 1943,
    tags: ["经典", "奇幻寓言", "三维书屋-demo"],
    coverUrl: undefined,
  });

  totalParas = chapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0);

  await Chapter.insertMany(
    chapters.map((ch, ci) => {
      const mood = moods[Math.min(ci, moods.length - 1)]!;
      const { subtitle } = splitSubtitle(ch.title);
      return {
        bookId: BOOK_ID,
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
    }),
  );

  const flatParagraphRefs = chapters.flatMap((ch) =>
    ch.paragraphs.map((p, idx) => ({
      paragraphId: p.id,
      chapterHint: String(ch.index + 1),
      priority: idx,
    })),
  );

  await SpoilerMap.create({
    bookId: BOOK_ID,
    version: 1,
    entries: flatParagraphRefs.slice(0, 10).map((hint, ix) => {
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
    }),
    generatedBy: "demo-seed@bookroom:v1",
  });

  await VisualStyle.create({
    bookId: BOOK_ID,
    name: "Starlit Paper · Warm Dust",
    illustrationPromptTemplate:
      "Watercolor gouache dusk sky, luminous stars, tactile paper fibers, restrained grain, nostalgic palette anchored on #b8763e.",
    cinematographyNotes:
      "Slow dolly pushes, volumetric amber haze, soft lens blooms on horizon lines, restrained motion blur.",
    paletteAnchorHex: "#b8763e",
    moodKeywords: ["nostalgic", "desert dusk", "bookpaper"],
    referenceImageUrls: ["https://example.com/refs/little-prince-moodboard.png"],
    isActive: true,
  });

  await ChapterAsset.insertMany(
    chapters.map((ch, idx) => ({
      bookId: BOOK_ID,
      chapterIndex: ch.index,
      assetSlot: "hero" as const,
      assetUrl: `https://example.com/generated/${BOOK_ID}/hero-chapter-${idx + 1}.webp`,
      technicalMeta: { mimeType: "image/webp", durationSec: undefined, bitrateKbps: undefined },
      generationTraceId: `demo-hero-${BOOK_ID}-${idx}`,
    })),
  );

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
    devices: [],
  });

  await ReadingProgress.create({
    userId: DEFAULT_DEMO_USER_ID,
    bookId: BOOK_ID,
    chapterIndex: 0,
    paragraphId: chapters[0]?.paragraphs[0]?.id ?? "p-unknown",
    syncVersion: 1,
    deviceId: "seed-device",
    percentComplete: Math.min(
      100,
      Math.round((1 / Math.max(totalParas, 1)) * 100),
    ),
  });

  const tenthParagraph = chapters.flatMap((c) => c.paragraphs)[9];
  await PendingQuestion.create({
    userId: DEFAULT_DEMO_USER_ID,
    bookId: BOOK_ID,
    question: "玫瑰到底是不是唯一的？",
    expectedReleaseParagraphId: tenthParagraph?.id ?? chapters[0]!.paragraphs[0]!.id,
    status: "queued",
    answer: undefined,
  });

  await GeneratedContent.create({
    userId: DEFAULT_DEMO_USER_ID,
    bookId: BOOK_ID,
    chapterIndex: 0,
    paragraphId: chapters[0]?.paragraphs[2]?.id,
    kind: "image",
    assetUrl: `https://example.com/generated/${BOOK_ID}/inline-p2.png`,
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
    bookId: BOOK_ID,
    paragraphId: chapters[1]?.paragraphs[3]?.id ?? chapters[0]!.paragraphs[0].id,
    note: "这里提到驯养与时间，很适合做情绪音乐拐点。",
    excerpt: chapters[1]?.paragraphs[3]?.text.slice(0, 120),
  });

  await CommunityShare.create({
    userId: DEFAULT_DEMO_USER_ID,
    bookId: BOOK_ID,
    slug: "little-prince-desert-evening-demo",
    title: "把星空折进纸页的晚上",
    excerpt: "共读样本：分享我在三维书屋沉浸式阅读器中截取的沙丘配色与情绪曲线。",
    previewImageUrl: `https://example.com/community/${BOOK_ID}/share-cover.png`,
    visibility: "public",
    stats: { likes: 12, impressions: 240 },
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

  console.info("[seed] complete — seeded book `%s`, %d paragraphs total.", BOOK_ID, totalParas);
}

seed()
  .catch((error) => {
    console.error("[seed] aborted:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
    console.info("[seed] mongoose connection closed");
  });
