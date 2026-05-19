/** OPF/container helpers — tolerant of assorted EPUBs (2.x / common 3 hybrids). */

import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
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

export interface ContainerXml {
  container?: {
    rootfiles?: {
      rootfile?: { "@full-path": string };
    };
  };
}

export function readRootFullPath(containerXml: string): string | null {
  const doc = parseXml<ContainerXml>(containerXml);
  const rf = doc.container?.rootfiles?.rootfile;
  if (!rf) return null;
  const fp = rf["@full-path"];
  return typeof fp === "string" && fp.trim().length ? fp.trim() : null;
}
