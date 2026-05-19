/**
 * CLI: `tsx app/lib/db/seed/epub-ingest-runner.ts`
 *
 * Flags:
 * `--include-little-prince` — ingest 小王子 EPUB instead of handcrafted sample-content DB rows
 * `--orphans` — also persist unmatched EPUBs with auto `extrabook-*` ids (e.g. 甄嬛传)
 * `--publish-orphans` — orphans become `status:public` / `isReady:true` instead of drafts
 */

import path from "node:path";

import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";

import { BOOKS } from "@/app/lib/data/books";
import { resolveCatalogEpubs } from "@/app/lib/epub/match-catalog-epubs";
import { DEFAULT_DEMO_USER_ID } from "@/app/lib/db/constants";
import { connectDB } from "@/app/lib/db/mongodb";

import type { EpubIngestOptions } from "./epub-ingest";
import { runEpubIngest } from "./epub-ingest";

const SAMPLE_DIR = path.resolve(process.cwd(), "sample_book");

if (!process.env.MONGODB_URI?.trim()) {
  loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), override: true });
}

const argv = new Set(process.argv.slice(2));
const skipSet = new Set<string>();

/** Default: preserve curated little-prince sample unless explicitly requested */
if (!argv.has("--include-little-prince")) skipSet.add("little-prince");

if (process.env.EPUB_INGEST_SKIP) {
  for (const id of process.env.EPUB_INGEST_SKIP.split(",")) {
    const t = id.trim();
    if (t.length) skipSet.add(t);
  }
}

const maxSpine = Number(process.env.MAX_EPUB_SPINE_SECTIONS ?? 620);

async function main() {
  await connectDB();

  const assignments = resolveCatalogEpubs(BOOKS, SAMPLE_DIR);

  console.info("[epub] resolved catalogue:");
  for (const [id, p] of Object.entries(assignments.catalog)) {
    if (!p) continue;
    console.info(` • ${id} ← ${path.basename(p)}`);
  }
  console.info("[epub] orphans (not matched exclusively to BOOKS slots):");
  for (const p of assignments.orphans) {
    console.info(" ·", path.basename(p));
  }

  const ingestOpts: EpubIngestOptions = {
    assignments,
    skipBookIds: skipSet,
    maxSpineSections: Number.isFinite(maxSpine) ? maxSpine : 620,
    ingestOrphans: argv.has("--orphans"),
    orphanPublicReady: argv.has("--publish-orphans"),
  };

  await runEpubIngest(BOOKS, ingestOpts);

  console.info(
    "[epub] done. demo progress user:",
    DEFAULT_DEMO_USER_ID,
    "(little-prince local progress unaffected unless you seeded after ingest)",
  );

  await mongoose.connection.close().catch(() => undefined);
}

main().catch((err) => {
  console.error("[epub] fatal:", err);
  mongoose.connection.close().catch(() => undefined);
  process.exitCode = 1;
});
