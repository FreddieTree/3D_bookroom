/**
 * Read-only MongoDB inspection script. No inserts/updates/deletes.
 *
 *   npm run db:inspect
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "../app/lib/db/mongodb";
import { Book } from "../app/lib/db/models/books";
import { Chapter } from "../app/lib/db/models/chapters";

const envLocalPath = path.resolve(process.cwd(), ".env.local");

if (!process.env.MONGODB_URI?.trim()) {
  if (existsSync(envLocalPath)) {
    loadDotenv({ path: envLocalPath, override: true });
    console.info("[inspect] loaded .env.local");
  } else loadDotenv();
}

function isPureAsciiDigits(s: string): boolean {
  return /^[0-9]+$/.test(s);
}

/** No Unicode letters (\p{L}) nor numbers (\p{N}) — blanks/punct only (empty trims as pure punct). */
function isPurePunctuationOrSpace(s: string): boolean {
  const t = s.trim();
  if (!t.length) return true;
  return !/[\p{L}\p{N}]/u.test(t);
}

function typeLabel(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  const t = typeof v;
  if (t !== "object") return t;
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (v instanceof Date) return "Date";
  if (mongoose.isValidObjectId(v)) return "ObjectId";
  return "Object";
}

function printAlignedTable(headers: string[], rows: string[][], widths: number[]) {
  const line = (cells: string[]) =>
    cells.map((c, i) => String(c).slice(0, widths[i]!).padEnd(widths[i]!)).join(" │ ");
  console.info(line(headers));
  console.info(widths.map((w) => "─".repeat(w)).join("─┼─"));
  for (const r of rows) console.info(line(r));
}

async function inspect() {
  await connectDB();
  const dbName = mongoose.connection.db?.databaseName ?? "?";

  console.info("\n═════════ 三维书屋 · 只读巡检 (inspect-books) ═════════");
  console.info(`database: ${dbName}`);
  console.info("mode: READ-ONLY (find / countDocuments / findOne — no writes)\n");

  // ── 1. Book overview ──────────────────────────────────────────────────
  const books = await Book.find({}).sort({ bookId: 1 }).lean().exec();

  console.info("──────────────── 1. 所有书概览 ────────────────\n");

  const widths1 = [26, 20, 12, 10, 7, 2];
  const rows1: string[][] = [];

  for (const b of books) {
    const bid = String(b.bookId);
    const bodyCount = await Chapter.countDocuments({
      bookId: bid,
      $or: [{ chapterType: "body" }, { chapterType: { $exists: false } }],
    }).exec();
    const th = Number(b.totalChapters);
    const ok = th === bodyCount;
    rows1.push([
      bid,
      String(b.title).slice(0, 40),
      String(th),
      String(bodyCount),
      ok ? "OK" : "⚠️不一致",
      ok ? "" : "≠",
    ]);
  }

  printAlignedTable(
    ["bookId", "title", "book.totalCh", "bodyCh#", "一致?", ""],
    rows1,
    widths1,
  );

  // ── 2. little-prince — full chapter dump ───────────────────────────────
  const lp = "little-prince";

  console.info("\n\n──────────────── 2. little-prince 全章节 (index 升序，不截断行数) ────────────────\n");

  const chs = await Chapter.find({ bookId: lp }).sort({ index: 1 }).lean().exec();
  console.info(`documents: ${chs.length}\n`);

  console.info("(titleLen = code unit length like .length；titleShown = JSON 字符串字面量，可见引号与转义)");

  /** One row per chapter: full title on own line avoids narrow table truncation confusion. */
  for (let i = 0; i < chs.length; i++) {
    const doc = chs[i]!;
    const title = doc.title ?? "";
    const pq = doc.paragraphs ?? [];
    const dig = isPureAsciiDigits(title) ? "YES" : "no";
    const pun = isPurePunctuationOrSpace(title) ? "YES" : "no";
    const first = pq[0]?.text ?? "";
    const preview = first.slice(0, 40);

    console.info("");
    console.info(`── index ${doc.index} │ 段数:${pq.length} │ title UTF-16 长度:${title.length} │ 纯ASCII数字:${dig} │ 无非文数字符(标点/空格):${pun}`);
    console.info(`title: ${JSON.stringify(title)}`);
    console.info(`首段40字: ${JSON.stringify(preview)}`);
  }

  // ── 3. Schema / field sampling ───────────────────────────────────────────
  console.info("\n\n──────────────── 3. 字段结构抽样 ────────────────\n");

  const sampleBook = await Book.findOne({}).sort({ bookId: 1 }).lean().exec();
  const sampleChapter = await Chapter.findOne({}).sort({ bookId: 1, index: 1 }).lean().exec();

  console.info("检查 chapters 是否存在 `chapterType` 等分型字段（当前 Mongoose schema 默认无）：");

  console.info("\n— books · 任选一条文档 (`findOne.sort bookId`): 顶层字段 · 类型 —");
  if (!sampleBook) {
    console.info("(empty)");
  } else {
    for (const k of Object.keys(sampleBook).sort()) {
      const v = sampleBook[k as keyof typeof sampleBook] as unknown;
      const lab = typeLabel(v);
      let extra = "";
      if (lab === "string" && typeof v === "string")
        extra = `sample=${JSON.stringify(v.length > 60 ? `${v.slice(0, 60)}…` : v)}`;
      else       console.info(`  ${k.padEnd(22)} ${lab.padEnd(16)} ${extra}`);
    }
  }

  console.info("\n— chapters · 任选一条文档: 顶层字段 · 类型 —");
  console.info("(paragraphs: 数组长度 + 仅首元素字段结构)");
  if (!sampleChapter) {
    console.info("(empty)");
  } else {
    const chapKeys = ["chapterType", "kind", "sectionType"];
    console.info("\n分型相关键存在性:");
    for (const k of chapKeys) {
      console.info(`  ${k}: ${Object.prototype.hasOwnProperty.call(sampleChapter, k) ? "present" : "absent (not in schema / not set)"}`);
    }

    for (const k of Object.keys(sampleChapter).sort()) {
      const v = sampleChapter[k as keyof typeof sampleChapter] as unknown;

      if (k === "paragraphs" && Array.isArray(v)) {
        console.info(`  paragraphs             Array(${v.length})`);
        const e0 = v[0];
        if (e0 !== undefined && typeof e0 === "object" && !Array.isArray(e0)) {
          console.info(`  paragraphs[0]          Object`);
          for (const pk of Object.keys(e0 as object).sort()) {
            console.info(`    └── ${pk.padEnd(16)} ${typeLabel((e0 as Record<string, unknown>)[pk])}`);
          }
        } else console.info(`  paragraphs[0]          ${typeLabel(e0)}`);
        continue;
      }

      console.info(`  ${k.padEnd(22)} ${typeLabel(v)}`);
    }
  }

  console.info("\n──────── 完成 · 断开连接 ────────\n");

  await mongoose.connection.close().catch(() => undefined);
}

inspect().catch((e) => {
  console.error("[inspect] fatal:", e);
  void mongoose.connection.close();
  process.exitCode = 1;
});
