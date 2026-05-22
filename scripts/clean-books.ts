/**
 * 数据库清洗：章节分型、正文重编号、回填 books 元数据。
 *
 * 默认 **dry-run**（只打印预览，零写入）。
 * 显式 `--apply` 才在事务中写入。
 *
 *   npm run db:clean              # 预览
 *   npm run db:clean -- --apply   # 写入（先完整预览打印，再在事务内重算并提交）
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
    console.info("[clean] loaded .env.local");
  } else loadDotenv();
}

const APPLY = process.argv.includes("--apply");

/** 前言 · 任一命中 → frontmatter（紧凑匹配）。长词、专名优先；「序」放末位。 */
const FRONTMATTER_KEYS = [
  "版权",
  "Contents",
  "目录",
  "导读",
  "名家讚譽",
  "名家赞誉",
  "推薦序",
  "推荐序",
  "推薦",
  "推荐",
  "人物介紹",
  "人物介绍",
  "賞析",
  "赏析",
  "譯後記",
  "译后记",
  "献给",
  "扉页",
  "作者简介",
  "译者序",
  "序言",
  "前言",
  "绪论",
  "序",
] as const;

const BACKMATTER_KEYS = [
  "相关信息",
  "附录",
  "后记",
  "跋",
  "版权声明",
  "鸣谢",
  "致谢",
  "出版后记",
  /** 补充：合集元信息页、注释等归入后记类（frontmatter 仍为优先匹配）。 */
  "注释",
  "题辞",
  "作品列表",
  "内容简介",
] as const;

type ChapterKind = "frontmatter" | "body" | "backmatter";

function compact(s: string) {
  return s.replace(/\s+/g, "").trim();
}

function titleMatchesKeyword(normTitle: string, keyword: string): boolean {
  const k = compact(keyword);
  if (!k.length) return false;
  const useAsciiFold = /[a-z]/i.test(k);
  const t = useAsciiFold ? normTitle.toLowerCase() : normTitle;
  const kk = useAsciiFold ? k.toLowerCase() : k;
  return t.includes(kk);
}

/**
 * 标题仅为「第 + 阿拉伯/全角数字 + 章」且段数极少 → 多为占位，归 frontmatter。
 * 不含中文数字章名（如「第二章优胜记略」compact 后仍含多余字，正则不匹配）。
 */
function isSparseArabicNumberedChapterTitle(title: string, paragraphCount: number): boolean {
  if (paragraphCount > 1) return false;
  const t = title.trim().replace(/\s+/g, " ");
  const normalized = t.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  return /^第\s*\d+\s*章\s*$/u.test(normalized);
}

function classifyChapterType(title: string, paragraphCount: number): ChapterKind {
  const norm = compact(title);

  for (const kw of FRONTMATTER_KEYS) {
    if (titleMatchesKeyword(norm, kw)) return "frontmatter";
  }
  for (const kw of BACKMATTER_KEYS) {
    if (titleMatchesKeyword(norm, kw)) return "backmatter";
  }
  if (isSparseArabicNumberedChapterTitle(title, paragraphCount)) {
    return "frontmatter";
  }
  return "body";
}

function computeDemoVisibility(bodyChapterCount: number): {
  visible: boolean;
  note: string;
} {
  if (bodyChapterCount <= 1) {
    return { visible: false, note: "正文章≤1（INCOMPLETE / 占位）→ 不向 demo 展示" };
  }
  if (bodyChapterCount > 50) {
    return { visible: false, note: "正文章>50（过长）→ 不向 demo 展示" };
  }
  return { visible: true, note: "正文章 2–50 章 → 向 demo 展示" };
}

function bodyCharacterCountFromChapters(arr: LeanCh[]): number {
  let n = 0;
  for (const ch of arr) {
    if (classifyChapterType(ch.title, ch.paragraphs.length) !== "body") continue;
    for (const p of ch.paragraphs) {
      n += p.text.length;
    }
  }
  return n;
}

/** 每分钟 300 字 → 向上取整到 0.5 h，至少 0.5 h */
function estimatedHoursFromChars(chars: number): number {
  if (chars <= 0) return 0.5;
  const hours = chars / 300 / 60;
  const stepped = Math.ceil(hours / 0.5) * 0.5;
  return Math.round(Math.max(0.5, stepped) * 100) / 100;
}

type LeanCh = {
  _id: mongoose.Types.ObjectId;
  bookId: string;
  index: number;
  title: string;
  paragraphs: { text: string }[];
  chapterType?: ChapterKind;
  bodyIndex?: number | null;
};

type PlannedRow = {
  _id: mongoose.Types.ObjectId;
  index: number;
  oldTitle: string;
  newTitle: string;
  kind: ChapterKind;
  bodyIndex: number | null;
  paragraphs: number;
};

type BookPlanResult = {
  bookId: string;
  title: string;
  spineCount: number;
  rows: PlannedRow[];
  front: { index: number; title: string }[];
  bodies: PlannedRow[];
  back: { index: number; title: string }[];
  newTotals: { totalChapters: number; totalParagraphs: number; estimatedHours: number };
  /** 清洗回填：demo 书单可见性（由正文章数量规则导出）。 */
  demoVisible: boolean;
  demoVisibleNote: string;
  health: {
    incomplete: boolean;
    spineMismatch: boolean;
  };
};

/**
 * 按 spine index 遍历：分型 → body 递增编号并重写 title；
 * rows 的顺序与 Mongo index 升序一致。
 */
function planBook(
  book: { bookId: string; title: string; totalChapters: number },
  spineChapters: LeanCh[],
): BookPlanResult {
  const sorted = [...spineChapters].sort((a, b) => a.index - b.index);

  const annotated = sorted.map((ch) => ({
    ch,
    kind: classifyChapterType(ch.title, ch.paragraphs.length),
  }));

  const rows: PlannedRow[] = [];
  const front: { index: number; title: string }[] = [];
  const back: { index: number; title: string }[] = [];

  let bodyCtr = 0;

  for (const { ch, kind } of annotated) {
    if (kind === "frontmatter") {
      front.push({ index: ch.index, title: ch.title });
      rows.push({
        _id: ch._id,
        index: ch.index,
        oldTitle: ch.title,
        newTitle: ch.title,
        kind,
        bodyIndex: null,
        paragraphs: ch.paragraphs.length,
      });
      continue;
    }
    if (kind === "backmatter") {
      back.push({ index: ch.index, title: ch.title });
      rows.push({
        _id: ch._id,
        index: ch.index,
        oldTitle: ch.title,
        newTitle: ch.title,
        kind,
        bodyIndex: null,
        paragraphs: ch.paragraphs.length,
      });
      continue;
    }

    bodyCtr += 1;
    rows.push({
      _id: ch._id,
      index: ch.index,
      oldTitle: ch.title,
      newTitle: `第 ${bodyCtr} 章`,
      kind: "body",
      bodyIndex: bodyCtr,
      paragraphs: ch.paragraphs.length,
    });
  }

  const bodies = rows.filter((r) => r.kind === "body");
  const totalParaBody = bodies.reduce((s, r) => s + r.paragraphs, 0);
  const chars = bodyCharacterCountFromChapters(sorted);

  const newTotals = {
    totalChapters: bodies.length,
    totalParagraphs: totalParaBody,
    estimatedHours: estimatedHoursFromChars(chars),
  };

  const spineMismatch =
    sorted.length !== book.totalChapters &&
    Math.abs(sorted.length - book.totalChapters) >= Math.max(8, Math.floor(sorted.length * 0.2));

  const incomplete = bodies.length <= 1;

  const dv = computeDemoVisibility(bodies.length);

  return {
    bookId: book.bookId,
    title: book.title,
    spineCount: sorted.length,
    rows,
    front,
    bodies,
    back,
    newTotals,
    demoVisible: dv.visible,
    demoVisibleNote: dv.note,
    health: { incomplete, spineMismatch },
  };
}

function rowNeedsUpdate(orig: LeanCh, p: PlannedRow): boolean {
  const curType = (orig.chapterType ?? "body") as ChapterKind;
  const curBi =
    orig.bodyIndex === undefined || orig.bodyIndex === null ? null : orig.bodyIndex;

  const wantBi = p.bodyIndex === null ? null : p.bodyIndex;

  return curType !== p.kind || curBi !== wantBi || orig.title !== p.newTitle;
}

function bookMetadataNeedsPatch(
  book: {
    totalChapters: number;
    totalParagraphs: number;
    estimatedHours: number;
    demoVisible?: boolean | null;
  },
  plan: BookPlanResult,
): boolean {
  const dvPatch =
    book.demoVisible == null || book.demoVisible !== plan.demoVisible;

  return (
    book.totalChapters !== plan.newTotals.totalChapters ||
    book.totalParagraphs !== plan.newTotals.totalParagraphs ||
    Math.round(book.estimatedHours * 1000) !== Math.round(plan.newTotals.estimatedHours * 1000) ||
    dvPatch
  );
}

function renderBookReport(
  bk: {
    bookId: string;
    title: string;
    totalChapters: number;
    totalParagraphs: number;
    estimatedHours: number;
    demoVisible?: boolean | null;
  },
  plan: BookPlanResult,
) {
  console.info(`${"═".repeat(72)}`);
  console.info(`═══ ${plan.title} (${plan.bookId}) ═══\n`);

  console.info(`分型结果：`);
  console.info(`  frontmatter: ${plan.front.length} 章`);
  if (plan.front.length) {
    console.info(`    [ ${plan.front.map((f) => `index=${f.index} 「${f.title}」`).join(" ; ")} ]`);
  }
  console.info(`  body:        ${plan.bodies.length} 章`);
  console.info(`  backmatter:  ${plan.back.length} 章`);
  if (plan.back.length) {
    console.info(`    [ ${plan.back.map((f) => `index=${f.index} 「${f.title}」`).join(" ; ")} ]`);
  }

  console.info(`\n正文重命名对照表（body 章节）：`);
  for (const b of plan.bodies) {
    console.info(
      `  原 index ${b.index}  | 原title ${JSON.stringify(b.oldTitle)}  →  bodyIndex ${b.bodyIndex}  | 新title ${JSON.stringify(b.newTitle)}  | ${b.paragraphs} 段`,
    );
  }

  console.info(`\n元数据变化：`);
  console.info(`  totalChapters:   ${bk.totalChapters} → ${plan.newTotals.totalChapters}`);
  console.info(`  totalParagraphs: ${bk.totalParagraphs} → ${plan.newTotals.totalParagraphs}`);
  console.info(`  estimatedHours:  ${bk.estimatedHours} → ${plan.newTotals.estimatedHours}`);
  console.info(`  demoVisible:     DB=${bk.demoVisible == null ? "（无字段 / null）" : String(bk.demoVisible)}  →  将写入 ${String(plan.demoVisible)}  (${plan.demoVisibleNote})`);

  const msgs: string[] = [];
  if (!plan.health.incomplete) msgs.push("OK");
  if (plan.health.incomplete) msgs.push("⚠️ INCOMPLETE（正文章 ≤1）");
  if (plan.health.spineMismatch)
    msgs.push("⚠️ 原书目 totalChapters 与 spine 条数偏差较大");

  console.info(`\n健康状态：${msgs.join(" · ")}`);
}

function countChapterDeltas(chs: LeanCh[], plan: BookPlanResult): number {
  let n = 0;
  for (const p of plan.rows) {
    const orig = chs.find((c) => c.index === p.index);
    if (orig && rowNeedsUpdate(orig, p)) n += 1;
  }
  return n;
}

async function fetchChapters(bookId: string, session?: mongoose.ClientSession): Promise<LeanCh[]> {
  const base = Chapter.find({ bookId }).sort({ index: 1 }).lean();
  const raw = session ? await base.session(session).exec() : await base.exec();
  return raw as unknown as LeanCh[];
}

async function main() {
  console.info(`
╔══════════════════════════════════════════════════════════════╗
║  clean-books · ${APPLY ? "APPLY （后将写入单个事务）" : "DRY-RUN （仅预览，无写入）"}          ║
╚══════════════════════════════════════════════════════════════╝
`);

  await connectDB();
  const dbName = mongoose.connection.db?.databaseName ?? "?";

  console.info(`[clean] ★ 当前数据库名: "${dbName}" — 写入前请务必核对。\n`);

  let booksSnapshot;
  try {
    booksSnapshot = await Book.find({}).sort({ bookId: 1 }).lean().exec();
  } catch (e) {
    console.error("[clean] 读取 books 失败:", e);
    process.exitCode = 1;
    await mongoose.connection.close();
    return;
  }

  const incompleteBooks: string[] = [];
  const demoVisibleTrue: string[] = [];
  const demoVisibleFalse: string[] = [];
  let chapterDeltaEstimate = 0;
  let bookMetaDeltaEstimate = 0;

  console.info(`${"═".repeat(72)}`);
  console.info(`▼ 预览 / 抽样（与实际执行使用相同分型逻辑）`);

  try {
    for (const bk of booksSnapshot) {
      const bid = bk.bookId;
      const chapters = await fetchChapters(bid);

      const plan = planBook({ bookId: bid, title: bk.title, totalChapters: bk.totalChapters }, chapters);

      if (plan.health.incomplete) incompleteBooks.push(bid);
      if (plan.demoVisible) demoVisibleTrue.push(bid);
      else demoVisibleFalse.push(bid);

      renderBookReport(
        {
          bookId: bid,
          title: bk.title,
          totalChapters: bk.totalChapters,
          totalParagraphs: bk.totalParagraphs,
          estimatedHours: bk.estimatedHours,
          demoVisible: "demoVisible" in bk ? (bk as { demoVisible?: boolean | null }).demoVisible : undefined,
        },
        plan,
      );

      chapterDeltaEstimate += countChapterDeltas(chapters, plan);
      if (bookMetadataNeedsPatch(bk, plan)) bookMetaDeltaEstimate += 1;

      console.info("");
    }
  } catch (e) {
    console.error("[clean] dry-run / 预览阶段出错（未做任何写入）:", e);
    process.exitCode = 1;
    await mongoose.connection.close();
    return;
  }

  console.info(`${"═".repeat(72)}`);
  console.info(`\n──────── 总结（预估变更量） ────────`);
  console.info(`  共扫描 ${booksSnapshot.length} 本书`);
  console.info(`  预计需更新章节文档：${chapterDeltaEstimate} 条`);
  console.info(`  预计需更新书目文档：${bookMetaDeltaEstimate} 条`);
  console.info(
    `  INCOMPLETE（正文 ≤1 章）：${
      incompleteBooks.length ? incompleteBooks.join(", ") : "（无）"
    }`,
  );
  console.info(
    `  demoVisible=true ：${demoVisibleTrue.length ? demoVisibleTrue.join(", ") : "（无）"}`,
  );
  console.info(
    `  demoVisible=false：${demoVisibleFalse.length ? demoVisibleFalse.join(", ") : "（无）"}\n`,
  );

  if (!APPLY) {
    console.info("[clean] dry-run 结束，数据库未改动。预览 OK 后再执行：`npm run db:clean -- --apply`\n");
    await mongoose.connection.close().catch(() => undefined);
    return;
  }

  console.info("\n[clean] 开始事务写入（单次 withTransaction），按上面预览逻辑在会话内重新拉取并重算。\n");

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      for (const bk of booksSnapshot) {
        const bid = bk.bookId;
        const fresh = await fetchChapters(bid, session);
        const plan = planBook({ bookId: bid, title: bk.title, totalChapters: bk.totalChapters }, fresh);

        for (const p of plan.rows) {
          const orig = fresh.find((c) => c.index === p.index);
          if (!orig) continue;
          if (!rowNeedsUpdate(orig, p)) continue;

          console.info(
            `[apply] Chapter bookId=${bid} mongoIndex=${p.index} chapterType=${p.kind} bodyIndex=${p.bodyIndex ?? "null"} title=${JSON.stringify(p.newTitle)}`,
          );

          await Chapter.updateOne(
            { _id: orig._id },
            {
              $set: {
                chapterType: p.kind,
                bodyIndex: p.bodyIndex,
                title: p.newTitle,
              },
            },
            { session },
          ).exec();
        }

        if (bookMetadataNeedsPatch(bk, plan)) {
          console.info(
            `[apply] Book bookId=${bid} totalChapters=${plan.newTotals.totalChapters} totalParagraphs=${plan.newTotals.totalParagraphs} estimatedHours=${plan.newTotals.estimatedHours} demoVisible=${plan.demoVisible}`,
          );
          await Book.updateOne(
            { bookId: bid },
            {
              $set: {
                totalChapters: plan.newTotals.totalChapters,
                totalParagraphs: plan.newTotals.totalParagraphs,
                estimatedHours: plan.newTotals.estimatedHours,
                demoVisible: plan.demoVisible,
              },
            },
            { session },
          ).exec();
        }
      }
    });

    console.info("\n[clean] ✓ 事务已提交。\n");
  } catch (e) {
    console.error("\n[clean] ✗ 写入失败 · 事务已回滚:", e);
    process.exitCode = 1;
  } finally {
    await session.endSession();
    await mongoose.connection.close().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error("[clean] fatal:", e);
  process.exitCode = 1;
  void mongoose.connection.close();
});
