/**
 * Deletes every Mongo row tied to a `bookId` that is outside `BOOKS[]`.
 * Safe after stray `--orphans` ingestion (e.g. `extrabook-*`) or leftover tests.
 *
 * CLI: `npm run db:prune`
 */
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";

import { BOOKS } from "@/app/lib/data/books";
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
import { VisualStyle } from "@/app/lib/db/models/visualStyles";
import { connectDB } from "@/app/lib/db/mongodb";

const envLocalPath = path.resolve(process.cwd(), ".env.local");

if (!process.env.MONGODB_URI?.trim()) {
  loadDotenv({ path: envLocalPath, override: true });
}

const ALLOWED_BOOK_IDS = BOOKS.map((b) => b.id);

async function prune() {
  await connectDB();
  const nin = ALLOWED_BOOK_IDS;

  console.info("[prune] retaining bookIds:", ALLOWED_BOOK_IDS.join(", "));
  console.info("[prune] deleting dependent rows for books NOT IN catalogue…");

  const pruneResults = await Promise.all([
    Chapter.deleteMany({ bookId: { $nin: nin } }),
    ChapterAsset.deleteMany({ bookId: { $nin: nin } }),
    SpoilerMap.deleteMany({ bookId: { $nin: nin } }),
    VisualStyle.deleteMany({ bookId: { $nin: nin } }),
    PendingQuestion.deleteMany({ bookId: { $nin: nin } }),
    ReadingProgress.deleteMany({ bookId: { $nin: nin } }),
    Conversation.deleteMany({ bookId: { $nin: nin } }),
    Bookmark.deleteMany({ bookId: { $nin: nin } }),
    GeneratedContent.deleteMany({ bookId: { $nin: nin } }),
    CommunityShare.deleteMany({ bookId: { $nin: nin } }),
    Book.deleteMany({ bookId: { $nin: nin } }),
  ]);
  const ch = pruneResults[0];
  const chAsset = pruneResults[1];
  const spoil = pruneResults[2];
  const books = pruneResults[10];

  console.info(
    `[prune] removed chapters=${ch.deletedCount} bookRows=${books.deletedCount} (among others assets=${chAsset.deletedCount}, spoilers=${spoil.deletedCount})`,
  );
  console.info("[prune] done — Atlas catalogue should match BOOKS[] only.");
}

prune()
  .catch((e) => {
    console.error("[prune] fatal:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => undefined);
  });
