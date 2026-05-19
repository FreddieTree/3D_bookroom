/** Walk EPUB ZIP → spine-ordered prose chapters suitable for mongoose `Chapter` rows. */

import AdmZip from "adm-zip";
import fs from "node:fs";
import path from "node:path";

import type { ParsedEpub, ParsedEpubChapter } from "@/app/lib/epub/types";
import {
  deriveChapterHeading,
  extractParagraphsFromXhtml,
} from "@/app/lib/epub/epub-html";
import { asArray, parseXml, readRootFullPath } from "@/app/lib/epub/epub-xml";

type ManifestItem = { "@id": string; "@href": string; "@media-type"?: string };
type SpineItemRef = { "@idref": string };

interface OpfXml {
  package?: {
    metadata?: Record<string, unknown>;
    manifest?: {
      item?: ManifestItem | ManifestItem[];
    };
    spine?: {
      itemref?: SpineItemRef | SpineItemRef[];
    };
  };
}

function posixDir(p: string) {
  return path.posix.dirname(p.replace(/\\/g, "/"));
}

function safeDecodeHrefSegment(seg: string) {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/** Resolve `href` relative to OPF folder with minimal `..` collapsing. */
function posixJoinRelative(opfDir: string, href: string) {
  const cleanHref = safeDecodeHrefSegment(href.replace(/\\/g, "/"));
  return path.posix.normalize(`${opfDir}/${cleanHref}`).replace(/\\/g, "/");
}

function normalizeEntryPath(name: string) {
  return name.replace(/\\/g, "/");
}

/** Skip obvious non-reading assets referenced on rare broken spines */
function skipSpineHref(href: string, mime?: string) {
  const lower = href.toLowerCase();
  if (/\.(jpe?g|png|gif|webp|svg|mp3|mp4)$/.test(lower)) return true;
  if (mime?.startsWith("image/")) return true;
  if (mime?.includes("navigation")) return true;
  if (lower.endsWith(".ncx")) return true;
  if (mime === "application/oebps-package+xml") return true;
  return false;
}

function normalizeMetaField(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v.trim().length ? v.trim() : undefined;
  const arr = asArray<{ "#text": string } | string>(v as never);
  for (const it of arr) {
    const t =
      typeof it === "string"
        ? it
        : typeof it?.["#text"] === "string"
          ? it["#text"]
          : "";
    if (t.trim()) return t.trim();
  }
  return undefined;
}

function dcTitle(md: Record<string, unknown>): string | undefined {
  return (
    normalizeMetaField(md.title) ??
    normalizeMetaField((md as { "dc:title"?: unknown })["dc:title"])
  );
}

function dcCreator(md: Record<string, unknown>): string | undefined {
  const v =
    md.creator ??
    (md as { "dc:creator"?: unknown })["dc:creator"] ??
    md["dc:publisher"];

  if (typeof v === "object" && v !== null && "#text" in (v as object)) {
    return normalizeMetaField((v as { "#text": string })["#text"]);
  }

  const arr = asArray<{ "#text": string } | string>(v as never);
  const names: string[] = [];
  for (const it of arr) {
    const t =
      typeof it === "string"
        ? it
        : typeof it?.["#text"] === "string"
          ? it["#text"]
          : "";
    if (t.trim()) names.push(t.trim());
  }
  return names.length ? Array.from(new Set(names)).slice(0, 4).join(" / ") : undefined;
}

/** Try canonical path first, fall back to case-insensitive / escaped variants. */
function readZipUtf8(zip: AdmZip, canonicalPath: string): string | undefined {
  const normCanon = canonicalPath.replace(/\\/g, "/");

  const tryRead = (p: string) => {
    try {
      const entry = zip.getEntry(p.replace(/\\/g, "/"));
      if (!entry || entry.isDirectory) return undefined;
      return entry.getData().toString("utf8");
    } catch {
      return undefined;
    }
  };

  const direct =
    tryRead(normCanon) ??
    tryRead(encodeURI(normCanon)) ??
    tryRead(normCanon.replace(/\//g, "\\"));
  if (direct) return direct;

  const targetLower = normCanon.toLowerCase().replace(/^\/+/, "");
  const tail = targetLower.split("/").pop() ?? targetLower;

  for (const e of zip.getEntries()) {
    if (e.isDirectory) continue;
    const n = normalizeEntryPath(e.entryName).toLowerCase();
    if (n === targetLower || n.endsWith(`/${tail}`) || n.endsWith(tail)) {
      return e.getData().toString("utf8");
    }
  }

  return undefined;
}

/**
 * Produce ordered chapters from an EPUB file on disk.
 *
 * Each spine-linked X/HTML document becomes one mongoose `Chapter` row.
 */
export function parseEpubFromPath(
  absEpubPath: string,
  options?: { maxSpineSections?: number },
): ParsedEpub {
  if (!fs.existsSync(absEpubPath)) throw new Error(`EPUB missing: ${absEpubPath}`);

  const maxSpineSections = options?.maxSpineSections ?? 520;

  const zip = new AdmZip(absEpubPath);

  const containerTxt = readZipUtf8(zip, "META-INF/container.xml");
  if (!containerTxt) throw new Error("META-INF/container.xml unreadable.");

  const opfRelativeRaw = readRootFullPath(containerTxt);
  if (!opfRelativeRaw) throw new Error("Unable to locate OPF package path.");

  /** Some OPFs erroneously encode backslashes — normalise aggressively */
  const opfRelative = opfRelativeRaw.replace(/\\/g, "/");

  const opfText = readZipUtf8(zip, opfRelative);
  if (!opfText) throw new Error(`OPF missing (${opfRelative}).`);

  const opfDoc = parseXml<OpfXml>(opfText);
  const pkg = opfDoc.package;
  if (!pkg?.manifest?.item || !pkg.spine?.itemref)
    throw new Error("Malformed OPF (manifest/spine).");

  const manifestItems = asArray(pkg.manifest.item);
  const spineRefs = asArray(pkg.spine.itemref);

  const idMap = new Map<string, ManifestItem>();
  for (const it of manifestItems) idMap.set(it["@id"], it);

  const md = pkg.metadata ?? {};
  const title = dcTitle(md) ?? "未命名书目";
  const author = dcCreator(md) ?? "未知作者";

  const opfDir = posixDir(opfRelative);

  const chaptersOut: ParsedEpubChapter[] = [];
  let ordinal = 0;

  for (const iref of spineRefs) {
    if (chaptersOut.length >= maxSpineSections) break;

    const idref = iref["@idref"];
    const manifestEntry = idMap.get(idref);
    if (!manifestEntry) continue;

    const mime = manifestEntry["@media-type"];
    const href = manifestEntry["@href"];

    const absContent = posixJoinRelative(opfDir, href);
    if (skipSpineHref(href, mime)) continue;

    const text = readZipUtf8(zip, absContent);
    if (!text) continue;

    const paragraphs = extractParagraphsFromXhtml(text);
    if (!paragraphs.length) continue;

    const heading = deriveChapterHeading(text, ordinal);

    chaptersOut.push({
      index: ordinal,
      title: heading.slice(0, 400),
      paragraphs,
      mood: "导入",
      rawHref: absContent,
    });
    ordinal += 1;
  }

  if (!chaptersOut.length) throw new Error("Parsed EPUB yielded zero textual chapters.");

  return {
    opfTitle: title.slice(0, 400),
    opfAuthors: author.slice(0, 400),
    chapters: chaptersOut,
  };
}
