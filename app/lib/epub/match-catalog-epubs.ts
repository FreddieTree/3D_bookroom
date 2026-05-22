/** Heuristic pairing between `BOOKS[]` catalogue rows → `sample_book/*.epub` paths. */

import fs from "node:fs";
import path from "node:path";

import type { BookMeta } from "@/app/lib/data/books";

const MIN_SCORE = 28;

const CORE_TRIGGERS: Record<string, string[]> = {
  "little-prince": ["小王子", "圣埃克苏佩里", "Saint", "Exupery"],
  "nineteen-eighty-four": [
    "1984",
    "nineteen",
    "eighty",
    "orwell",
    "奥威尔",
    "乔治",
  ],
  "the-old-man-and-the-sea": [
    "老人与海",
    "海明威",
    "hemingway",
    "old man",
    "the sea",
  ],
  "aq-zhengzhuan": ["阿Q", "阿q", "鲁迅", "正传"],
  "village-teacher": ["乡村教师", "刘慈欣"],
  "death-of-ivan-ilyich": [
    "伊凡",
    "伊万",
    "伊里奇",
    "伊利奇",
    "托尔斯泰",
    "Tolstoy",
    "ivan",
    "ilyich",
    "illic",
    "Смерть",
    "Ильича",
    "Толстой",
  ],
};

export type EpubAssignments = {
  catalog: Partial<Record<BookMeta["id"], string>>;
  orphans: string[];
};

function splitTokens(s: string) {
  return s
    .normalize("NFKC")
    .split(/[\s\u3000・·,:，。;:（）()/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length < 120);
}

function triggersForBook(meta: BookMeta): string[] {
  const hinted = CORE_TRIGGERS[meta.id] ?? [];
  const fromTitleAuthor = [...splitTokens(meta.title), ...splitTokens(meta.author)];

  const sourceHint = meta.sourceFiles?.[0]?.split("[")[0]?.split(".epub")[0] ?? "";
  const fromSource =
    sourceHint.trim().length > 4 ? splitTokens(sourceHint).filter((w) => w.length >= 2) : [];

  return [...new Set([...hinted, ...fromTitleAuthor, ...fromSource])];
}

function basenameNorm(p: string) {
  return path.basename(p).normalize("NFKC");
}

function scoreFileForBook(absPath: string, meta: BookMeta): number {
  const bn = basenameNorm(absPath).toLowerCase();
  let score = 0;
  for (const trig of triggersForBook(meta)) {
    if (trig.length < 2) continue;
    const t = trig.toLowerCase();
    if (bn.includes(t)) score += Math.min(50, t.length + 8);
    if (/[a-z]/i.test(t) && bn.includes(t.replace(/[\s_-]+/g, "").toLowerCase())) score += 4;
  }
  return score;
}

export function listEpubFiles(sampleAbsDir: string): string[] {
  if (!fs.existsSync(sampleAbsDir)) return [];
  return fs
    .readdirSync(sampleAbsDir)
    .filter((name) => name.toLowerCase().endsWith(".epub"))
    .map((name) => path.join(sampleAbsDir, name))
    .filter((abs) => fs.statSync(abs).isFile());
}

/**
 * Builds a deterministic best-effort pairing of catalogue ↔ EPUB basename keywords.
 *
 * Remaining unmatched files populate `orphans` for optional extra ingestion.
 */
export function resolveCatalogEpubs(books: BookMeta[], sampleAbsDir: string): EpubAssignments {
  const files = listEpubFiles(sampleAbsDir);
  const assignments: EpubAssignments = { catalog: {}, orphans: [] };

  const consumed = new Set<string>();

  for (const meta of books) {
    let bestPath: string | null = null;
    let bestScore = 0;
    for (const absPath of files) {
      if (consumed.has(absPath)) continue;
      const score = scoreFileForBook(absPath, meta);
      if (score > bestScore) {
        bestScore = score;
        bestPath = absPath;
      }
    }
    if (bestPath && bestScore >= MIN_SCORE) {
      assignments.catalog[meta.id] = bestPath;
      consumed.add(bestPath);
    }
  }

  for (const absPath of files) {
    if (!consumed.has(absPath)) assignments.orphans.push(absPath);
  }

  return assignments;
}
