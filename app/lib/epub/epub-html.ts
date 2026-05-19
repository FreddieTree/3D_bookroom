/** Pull readable paragraphs from packaged X/HTML (EPUB content documents). */

import * as cheerio from "cheerio";

const MIN_BODY_CHUNK = 80;
const HARD_PARA_CHARS = 12_000;

function collapseWs(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function splitLongParagraph(text: string, maxChars = HARD_PARA_CHARS): string[] {
  if (text.length <= maxChars) return text ? [text] : [];
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    const slice = collapseWs(text.slice(i, i + maxChars));
    if (slice) parts.push(slice);
  }
  return parts;
}

/**
 * Paragraph list for one spine document.
 * Prefer real `<p>` nodes; fallback to chunked body text when layout is unconventional.
 */
export function extractParagraphsFromXhtml(markup: string): string[] {
  const $ = cheerio.load(markup, { xml: true });

  $("script, style, svg, iframe, noscript").remove();

  let title = $("title").first().text().trim();
  $("h1, h2, h3")
    .first()
    .each((_, el) => {
      if (!title) title = $(el).text().trim();
    });

  const rawPs: string[] = [];
  $("body p").each((_, el) => {
    const t = collapseWs($(el).text());
    if (t.length >= 8) rawPs.push(t);
  });

  let merged: string[] = [];
  for (const p of rawPs) {
    merged.push(...splitLongParagraph(p));
  }

  /** Table-of-contents shells often omit `<p>`; synthesize from flattened body */
  if (merged.length === 0) {
    const bodyTxt = collapseWs($("body").text());
    if (bodyTxt.length >= MIN_BODY_CHUNK) {
      merged = splitLongParagraph(bodyTxt).filter((chunk) => chunk.length >= MIN_BODY_CHUNK);
      if (!merged.includes(bodyTxt) && merged.length === 0) merged = splitLongParagraph(bodyTxt);
    }
  }

  const noiseLead = /^([（(]?版权|著作权|版权声明|ISBN|电子书|排版|校对)/;
  merged = merged.filter((t) => t.length >= 12 && !noiseLead.test(t));

  /** Title line sometimes duplicated inside first paragraph — drop empty title echo */
  if (title.length > 40 && merged[0] === title) merged.shift();

  return merged.slice(0, 5000);
}

export function deriveChapterHeading(markup: string, fallbackOrdinal: number): string {
  const $ = cheerio.load(markup, { xml: true });

  $("script, style, svg").remove();

  const h =
    $("h1").first().text().trim() ||
    $("h2").first().text().trim() ||
    $("title").first().text().trim();

  if (h.length >= 2 && h.length < 220) return h;
  return `第 ${fallbackOrdinal + 1} 章`;
}
