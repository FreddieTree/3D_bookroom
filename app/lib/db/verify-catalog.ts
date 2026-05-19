/**
 * Validates catalogue ↔ Mongo coherence after running `npm run db:seed`.
 *
 * Intended for demos / CI before shipping.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";

import { BOOKS } from "@/app/lib/data/books";
import { mongoEstimatedParagraphs } from "@/app/lib/data/book-db-mapping";
import { getChaptersForBook } from "@/app/lib/data/sample-content";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { connectDB } from "@/app/lib/db/mongodb";
import { Book } from "@/app/lib/db/models/books";
import { Chapter } from "@/app/lib/db/models/chapters";
import { ReadingProgress } from "@/app/lib/db/models/readingProgress";

const envLocalPath = path.resolve(process.cwd(), ".env.local");

if (!process.env.MONGODB_URI?.trim()) {
  if (existsSync(envLocalPath)) loadDotenv({ path: envLocalPath, override: true });
}

let exitCode = 0;

function fail(msg: string) {
  exitCode = 1;
  console.error("[verify] FAIL:", msg);
}

function warn(msg: string) {
  console.warn("[verify] WARN:", msg);
}

function ok(msg: string) {
  console.info("[verify] OK:", msg);
}

async function verify() {
  console.info("[verify] connecting Atlas…");
  await connectDB();
  const t0 = performance.now();

  const catalogueIds = BOOKS.map((b) => b.id);

  const bookCount = await Book.countDocuments({ bookId: { $in: catalogueIds } }).exec();

  if (bookCount !== catalogueIds.length) {
    fail(
      `Books count mismatch: expected ${catalogueIds.length}, found ${bookCount}. Run npm run db:seed.`,
    );
  } else {
    ok(`${bookCount} book metadata rows synced with BOOKS[].`);
  }

  const strayBooks =
    (await Book.distinct("bookId")
      .exec()
      .then((ids) => ids.filter((id) => !catalogueIds.includes(id)))) ?? [];

  if (strayBooks.length > 0) {
    warn(
      `Extraneous Atlas books outside UI catalogue (${strayBooks.join(", ")}) — safe but may confuse dashboards.`,
    );
  }

  const orphaned = (
    await Chapter.distinct("bookId", {
      bookId: { $nin: catalogueIds },
    }).exec()
  ).filter(Boolean);

  if (orphaned.length) {
    fail(`Orphan chapters for unknown books: ${orphaned.join(", ")}`);
  } else {
    ok("No orphan chapters (strict book catalogue).");
  }

  /** Per-title chapter & paragraph coherence */
  for (const meta of BOOKS) {
    const mongo = await Book.findOne({ bookId: meta.id }).lean().exec();

    if (!mongo) {
      fail(`missing Book row ${meta.id}`);
      continue;
    }

    const chapters = await Chapter.find({ bookId: meta.id })
      .sort({ index: 1 })
      .lean()
      .exec();

    const chCount = chapters.length;

    const sample = getChaptersForBook(meta.id);
    if (sample?.length) {
      if (chCount !== sample.length) {
        fail(
          `${meta.id}: Mongo chapter rows=${chCount}, sample-content chapters=${sample.length}`,
        );
      }

      let paraSum = 0;
      for (const doc of chapters) {
        paraSum += doc.paragraphs.length;
      }

      if (paraSum !== mongo.totalParagraphs) {
        fail(
          `${meta.id}: paragraph sum ${paraSum} != Book.totalParagraphs ${mongo.totalParagraphs}`,
        );
      }
    } else {
      if (chCount !== 1 || chapters[0]?.paragraphs.length !== mongoEstimatedParagraphs(meta)) {
        fail(
          `${meta.id}: placeholder chapter/scaffold malformed (expect 1 scaffold chapter).`,
        );
      }

      if (meta.totalChapters > 1) {
        warn(
          `${meta.id}: UI advertises ${meta.totalChapters} chapters but ingestion only scaffolded chapter 0 (expected until EPUB split).`,
        );
      }
    }
  }

  const demoProgress = await ReadingProgress.findOne({
    userId: DEFAULT_DEMO_USER_ID,
    bookId: "little-prince",
  })
    .lean()
    .exec();

  if (!demoProgress) {
    warn("ReadingProgress for demo persona + little-prince missing (seed persona layer?).");
  } else {
    ok("demo reading progress anchor exists.");
  }

  console.info("[verify] wall time(ms)=", Math.round(performance.now() - t0));
}

verify()
  .catch((error) => {
    console.error("[verify] fatal:", error);
    exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => undefined);
    process.exit(exitCode);
  });
