/**
 * Persist EPUB parses into mongo `Chapter` / `Book` rows (destructive rewrite per targeted book).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Book } from "@/app/lib/db/models/books";
import { Chapter } from "@/app/lib/db/models/chapters";
import { SpoilerMap } from "@/app/lib/db/models/spoilerMaps";
import type { BookMeta } from "@/app/lib/data/books";
import type { EpubAssignments } from "@/app/lib/epub/match-catalog-epubs";
import { parseEpubFromPath } from "@/app/lib/epub/epub-parse";
import type { ParsedEpub, ParsedEpubChapter } from "@/app/lib/epub/types";

export interface EpubIngestOptions {
  assignments: EpubAssignments;
  skipBookIds: Set<string>;
  maxSpineSections?: number;
  ingestOrphans: boolean;
  orphanPublicReady: boolean;
}

function estimateReadingHours(chars: number) {
  /** ~≈3800 simplified Chinese glyphs / hour heuristic for hackathon scaffolding */
  return Math.max(0.35, +(chars / 5500).toFixed(2));
}

function mongoChapters(bookId: string, parsedChapters: ParsedEpubChapter[]) {
  return parsedChapters.map((ch) => ({
    bookId,
    index: ch.index,
    title: ch.title,
    subtitle: undefined as string | undefined,
    paragraphs: ch.paragraphs.map((text, pi) => ({
      id: `${bookId}-ch${String(ch.index).padStart(3, "0")}-p${String(pi).padStart(4, "0")}`,
      text,
      order: pi,
      isKeyScene:
        pi % 47 === 9 || (pi === 0 && ch.index % 11 === 0) || pi === Math.floor(ch.paragraphs.length / 2),
    })),
    totalParagraphs: ch.paragraphs.length,
    mood: ch.mood,
  }));
}

async function bumpBlankSpoilerMap(bookId: string, tag: string) {
  const latest = await SpoilerMap.findOne({ bookId }).sort({ version: -1 }).exec();
  const nextVersion = (latest?.version ?? 0) + 1;
  await SpoilerMap.deleteMany({ bookId }).exec();

  await SpoilerMap.create({
    bookId,
    version: nextVersion,
    entries: [],
    generatedBy: tag,
  });
}

async function bulkInsertChapterChunks(inserts: ReturnType<typeof mongoChapters>) {
  /** Avoid rare BSON document overflow on megascale compilations */
  const CHUNK = 80;
  for (let offset = 0; offset < inserts.length; offset += CHUNK) {
    const slice = inserts.slice(offset, offset + CHUNK);
    if (!slice.length) continue;
    await Chapter.insertMany(slice, { ordered: false });
  }
}

export async function ingestCatalogueEpub(book: BookMeta, absPath: string, opts: EpubIngestOptions) {
  if (opts.skipBookIds.has(book.id)) {
    console.info(`[epub] skip (--skip) » ${book.id}`);
    return false;
  }

  console.info("[epub] parsing »", path.basename(absPath));

  let parsed: ParsedEpub;

  try {
    parsed = parseEpubFromPath(absPath, { maxSpineSections: opts.maxSpineSections ?? 520 });
  } catch (err) {
    console.error("[epub] parse failed »", absPath, err);
    throw err;
  }

  const charCount = parsed.chapters.reduce(
    (sum, ch) => sum + ch.paragraphs.reduce((s2, txt) => s2 + txt.length, 0),
    0,
  );

  const chapterDocs = mongoChapters(book.id, parsed.chapters);
  await Chapter.deleteMany({ bookId: book.id }).exec();
  await bulkInsertChapterChunks(chapterDocs);

  await bumpBlankSpoilerMap(book.id, `epub-ingest:${book.id}`);

  const res = await Book.updateOne(
    { bookId: book.id },
    {
      $set: {
        totalChapters: parsed.chapters.length,
        totalParagraphs: chapterDocs.reduce((acc, doc) => acc + doc.totalParagraphs, 0),
        estimatedHours: estimateReadingHours(charCount),
        isReady: true,
        status: "public",
        longDesc:
          `EPUB 自动导入 (${path.basename(absPath)}) · spine→章节（每 spine HTML 一页）。`,
      },
      $addToSet: {
        tags: "src:epub",
      },
    },
    { upsert: false },
  ).exec();

  if (!res.matchedCount) {
    console.warn(
      `[epub] catalogue row missing — run npm run db:seed first (bookId=${book.id}); update skipped.`,
    );
  }

  console.info(
    `[epub] inserted ${chapterDocs.length} chapters / ${chapterDocs.reduce((a, c) => a + c.totalParagraphs, 0)} paragraphs (${book.id})`,
  );

  return true;
}

function orphanSlugForPath(absPath: string): string {
  const bn = path.basename(absPath);
  const hash = crypto.createHash("sha256").update(bn).digest("hex").slice(0, 14);
  return `extrabook-${hash}`;
}

export async function ingestOrphanEpub(absPath: string, opts: EpubIngestOptions) {
  if (!opts.ingestOrphans) return false;

  console.info("[epub] orphan-ingest »", path.basename(absPath));

  const parsed = parseEpubFromPath(absPath, { maxSpineSections: opts.maxSpineSections ?? 620 });

  const bookId = orphanSlugForPath(absPath);

  /** Collapse duplicate runs if rerun */
  await Chapter.deleteMany({ bookId }).exec();

  /** Remove stray prior row if regenerated */
  await Book.deleteOne({ bookId }).exec();

  const chapterDocs = mongoChapters(bookId, parsed.chapters);
  await bulkInsertChapterChunks(chapterDocs);

  await bumpBlankSpoilerMap(bookId, `epub-ingest:${bookId}:orphan`);

  const chars = parsed.chapters.reduce(
    (sum, ch) => sum + ch.paragraphs.reduce((s2, t) => s2 + t.length, 0),
    0,
  );

  await Book.create({
    bookId,
    title: parsed.opfTitle.slice(0, 200),
    titleEn: parsed.opfTitle.slice(0, 200),
    author: parsed.opfAuthors.slice(0, 200),
    coverColor: "#73635a",
    coverEmoji: "📎",
    shortDesc:
      `${path.basename(absPath)} 自动归档（未见于 UI 书单）。可由后续编辑补充 metadata。`,
    longDesc: orphanReadmeNote(path.basename(absPath)),
    totalChapters: parsed.chapters.length,
    totalParagraphs: chapterDocs.reduce((acc, doc) => acc + doc.totalParagraphs, 0),
    estimatedHours: estimateReadingHours(chars),
    language: "zh",
    isReady: opts.orphanPublicReady,
    status: opts.orphanPublicReady ? ("public" as const) : ("private" as const),
    tags: ["三维书屋", "src:epub", "catalog:extra"],
    coverUrl: undefined,
  });

  console.info("[epub] orphan ready »", bookId, "| chapters=", chapterDocs.length);

  return true;
}

function orphanReadmeNote(file: string) {
  return [`EPUB 自动入库（extras） · source=${file}`, "UI 书单未声明 — 按需合并进 `BOOKS[]`。"].join(
    "\n",
  );
}
/** Drive catalogue + orphans according to resolver output */
export async function runEpubIngest(allBooks: BookMeta[], opts: EpubIngestOptions) {
  /** Catalogue */
  for (const book of allBooks) {
    const epubPath = opts.assignments.catalog[book.id];
    if (!epubPath || !fs.existsSync(epubPath)) {
      if (!opts.skipBookIds.has(book.id)) {
        console.warn(`[epub] no epub assignment for catalogue id=${book.id}`);
      }
      continue;
    }

    await ingestCatalogueEpub(book, epubPath, opts);
  }

  /** Unmatched leftovers */
  for (const stray of opts.assignments.orphans) {
    if (!opts.ingestOrphans) {
      console.info("[epub] orphan queued (skipped, pass --orphans) »", path.basename(stray));
      continue;
    }
    await ingestOrphanEpub(stray, opts);
  }

  console.info("[epub] ingestion pass complete.");
}
