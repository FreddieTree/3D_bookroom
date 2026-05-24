/**
 * 读完页专用 mock：情绪曲线、金句卡片等（不接 API）。
 */

export type EmotionPoint = {
  chapter: string;
  intensity: number;
  /** 是否显示峰顶标注 */
  peak?: boolean;
  peakLabel?: string;
};

export type GoodQuestionCard = {
  id: string;
  quote: string;
  chapter: string;
};

export const LITTLE_PRINCE_EMOTION_DATA: EmotionPoint[] = [
  { chapter: "第 1 章", intensity: 22, peak: false },
  {
    chapter: "第 2 章",
    intensity: 55,
    peak: true,
    peakLabel: "转机",
  },
  {
    chapter: "第 3 章",
    intensity: 92,
    peak: true,
    peakLabel: "高潮",
  },
  { chapter: "合卷", intensity: 34, peak: false, peakLabel: "温柔回落" },
];

export const MOCK_GOOD_QUESTIONS: GoodQuestionCard[] = [
  {
    id: "gq1",
    quote: "驯养到底是拥有，还是愿意为对方浪费时间？",
    chapter: "第 2 章",
  },
  {
    id: "gq2",
    quote: "玫瑰的刺，是为了防备别人，还是防备自己的脆弱？",
    chapter: "第 2 章",
  },
  {
    id: "gq3",
    quote: "大人第一眼看见的是帽子，孩子第一眼看见的是什么？",
    chapter: "第 1 章",
  },
];

/** 演示用阅读天数（与真实日历无关） */
export const FINISHED_DEMO_DAYS = 5;

/** 与本地对话取 max，保证文案有表现力 */
export function formatFinishedSubtitle(
  bookTitle: string,
  userDialogueTurns: number,
): string {
  const turns = Math.max(userDialogueTurns, 32);
  return `《${bookTitle}》· ${FINISHED_DEMO_DAYS} 天 · ${turns} 段对话`;
}

export function themeSongTitle(bookTitle: string): string {
  return `《${bookTitle}》主题曲`;
}

/** 极短静音 wav，满足 <audio> 控件可播放且不联网 */
export const MOCK_SILENT_AUDIO =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
