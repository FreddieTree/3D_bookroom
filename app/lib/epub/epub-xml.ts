/** OPF/container helpers — tolerant of assorted EPUBs (2.x / common 3 hybrids). */

import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  /** Must match accessors in this module + `epub-parse.ts` (`@href`, `@id`, …). */
  attributeNamePrefix: "@",
  trimValues: true,
  removeNSPrefix: true,
});

export function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseXml<Document>(xml: string): Document {
  return xmlParser.parse(xml) as Document;
}

type RootFileRow = Record<string, unknown>;

function normalizeOpfHref(fp: string) {
  return fp.replace(/\\/g, "/").trim();
}

/**
 * Locate primary package document from `META-INF/container.xml`.
 * Tolerates multiple `<rootfile>` rows and legacy `@_full-path` attribute keys.
 */
function pickOpfFullPathFromRootfiles(rootfiles: RootFileRow[]): string | null {
  if (!rootfiles.length) return null;

  /** Prefer RFC OPF MIME when multiple rootfiles */
  const mimePreferred = rootfiles.filter(
    (rf) =>
      typeof rf["@media-type"] === "string" &&
      (rf["@media-type"] as string).includes("oebps-package"),
  );
  const candidates = mimePreferred.length ? mimePreferred : rootfiles;

  function pathOf(rf: RootFileRow): string | undefined {
    const a = rf["@full-path"];
    const b = rf["@_full-path"];
    if (typeof a === "string" && a.trim()) return a.trim();
    if (typeof b === "string" && b.trim()) return b.trim();
    return undefined;
  }

  for (const rf of candidates) {
    const fp = pathOf(rf);
    if (fp && /\.opf$/i.test(fp)) return normalizeOpfHref(fp);
  }

  const first = pathOf(candidates[0]!);
  return first ? normalizeOpfHref(first) : null;
}

export interface ContainerXml {
  container?: {
    rootfiles?: {
      /** EPUB allows multiple `<rootfile>` entries; OPF package is typically the first OPF-ish path. */
      rootfile?: RootFileRow | RootFileRow[];
    };
  };
}

export function readRootFullPath(containerXml: string): string | null {
  const doc = parseXml<ContainerXml>(containerXml);
  const rf = doc.container?.rootfiles?.rootfile;
  if (!rf) return null;
  const roots = asArray(rf);
  return pickOpfFullPathFromRootfiles(roots);
}
