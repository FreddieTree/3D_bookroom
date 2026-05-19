export interface ParsedEpubChapter {
  index: number;
  title: string;
  paragraphs: string[];
  mood: string;
  rawHref: string;
}

export interface ParsedEpub {
  opfTitle: string;
  opfAuthors: string;
  chapters: ParsedEpubChapter[];
}
