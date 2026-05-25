/**
 * 阅读地图 Mock — 《小王子》前三章时间轴节点（演示用，不调 API）。
 */

export type BookmarkEntry = {
  paragraphId: string;
  chapterIndex: number;
  createdAt: number;
};

export type MapNodeType =
  | "current"
  | "chapter"
  | "image"
  | "dialogue"
  | "character"
  | "pending"
  | "bookmark"
  | "bgm";

export type MapNodePayload = {
  title?: string;
  preview?: string;
  imageUrl?: string;
  characterName?: string;
  pendingQuestion?: string;
  pendingStatus?: "waiting" | "ready";
};

export interface MapNode {
  id: string;
  paragraphId: string;
  chapterIndex: number;
  type: MapNodeType;
  timestamp: Date;
  payload: MapNodePayload;
}

/** Demo「现在」锚点 —— 相对时间稳定便于截屏 */
export const MAP_DEMO_NOW = new Date("2026-05-18T15:00:00+08:00");

function ago(hours: number): Date {
  return new Date(MAP_DEMO_NOW.getTime() - hours * 3600_000);
}

type Raw = Omit<MapNode, "timestamp"> & { hoursAgo: number };

/** 28 条节点，覆盖第 1–3 章段落 id */
const RAW_NODES: Raw[] = [
  {
    id: "mn-01",
    paragraphId: "p-c3-8",
    chapterIndex: 2,
    type: "dialogue",
    hoursAgo: 1.25,
    payload: {
      title: "与 AI：驯养是什么",
      preview:
        "你问：仪式为什么能让某一时刻不同？我说：就像你总在同一盏灯下翻书，灯和书都成了「我们的」时间。",
    },
  },
  {
    id: "mn-02",
    paragraphId: "p-c3-7",
    chapterIndex: 2,
    type: "image",
    hoursAgo: 2,
    payload: {
      title: "花园与玫瑰",
      preview: "成千上万朵玫瑰在风里摇头，像一场迟到盛大的询问。",
      imageUrl: "",
    },
  },
  {
    id: "mn-03",
    paragraphId: "p-c3-6",
    chapterIndex: 2,
    type: "character",
    hoursAgo: 3,
    payload: {
      characterName: "地理学家",
      title: "人物卡",
      preview:
        "他从不离开书桌，却把别人的抵达写成词条。「短暂」落进小王子的耳朵，比任何风暴都冷。",
    },
  },
  {
    id: "mn-04",
    paragraphId: "p-c3-5",
    chapterIndex: 2,
    type: "pending",
    hoursAgo: 4,
    payload: {
      title: "悬念",
      pendingQuestion: "点灯人每分钟点灯又熄灯——到底是尽职，还是被规矩吞掉了睡眠？",
      pendingStatus: "waiting",
      preview: "已加入悬念队列，稍后揭晓。",
    },
  },
  {
    id: "mn-05",
    paragraphId: "p-c3-4",
    chapterIndex: 2,
    type: "bookmark",
    hoursAgo: 5,
    payload: {
      title: "摘录 · 星星存进银行",
      preview: "商人把星星编号，仿佛占有名字就能得到光。你在页边写：富有之后呢？",
    },
  },
  {
    id: "mn-06",
    paragraphId: "p-c3-3",
    chapterIndex: 2,
    type: "bgm",
    hoursAgo: 6,
    payload: {
      title: "氛围：沙与钟摆",
      preview: "极轻弦乐 + 远处风声（Mock）。适合读酒鬼那一节的循环。",
    },
  },
  {
    id: "mn-07",
    paragraphId: "p-c3-2",
    chapterIndex: 2,
    type: "dialogue",
    hoursAgo: 8,
    payload: {
      title: "与 AI：虚荣者的掌声",
      preview:
        "「被崇拜」和「被看见」差在哪里？我们把它拆成回响与回声——一个需要人群，一个只需要真实的一声嗯。",
    },
  },
  {
    id: "mn-08",
    paragraphId: "p-c3-1",
    chapterIndex: 2,
    type: "image",
    hoursAgo: 10,
    payload: {
      title: "六颗行星速写",
      preview: "六枚硬币大小的星球排成一列，各自轰鸣。",
      imageUrl: "",
    },
  },
  {
    id: "mn-09",
    paragraphId: "p-c2-11",
    chapterIndex: 1,
    type: "dialogue",
    hoursAgo: 12,
    payload: {
      title: "与 AI：回去到底是哪条路",
      preview:
        "他说要回星球浇水。我们争论「回去」是地理还是心里——最后认为指南针指北，心却可能指着一朵花。",
    },
  },
  {
    id: "mn-10",
    paragraphId: "p-c2-10",
    chapterIndex: 1,
    type: "character",
    hoursAgo: 14,
    payload: {
      characterName: "小王子",
      title: "夜空下的提问",
      preview: "沙漠很冷，你们却像坐在看不见的炉火边——真正的暖，常是被理解的那一瞬。",
    },
  },
  {
    id: "mn-11",
    paragraphId: "p-c2-9",
    chapterIndex: 1,
    type: "bookmark",
    hoursAgo: 16,
    payload: {
      title: "标记 · 抬头看星",
      preview: "其中一颗上有一朵花在等你——孤独就不那么锋利。",
    },
  },
  {
    id: "mn-12",
    paragraphId: "p-c2-8",
    chapterIndex: 1,
    type: "pending",
    hoursAgo: 18,
    payload: {
      title: "悬念",
      pendingQuestion: "猴面包树若不及时拔掉，星球会裂开——这隐喻更适合成人哪一类疏忽？",
      pendingStatus: "ready",
      preview: "答案已就绪，在阅读地图中长按查看。",
    },
  },
  {
    id: "mn-13",
    paragraphId: "p-c2-7",
    chapterIndex: 1,
    type: "image",
    hoursAgo: 20,
    payload: {
      title: "沙丘线稿",
      preview: "两道脚印并排，很快被风修平。",
      imageUrl: "",
    },
  },
  {
    id: "mn-14",
    paragraphId: "p-c2-6",
    chapterIndex: 1,
    type: "bgm",
    hoursAgo: 22,
    payload: {
      title: "氛围：数星星的人",
      preview: "极简钢琴，四分音符像灯的明灭。",
    },
  },
  {
    id: "mn-15",
    paragraphId: "p-c2-5",
    chapterIndex: 1,
    type: "dialogue",
    hoursAgo: 24,
    payload: {
      title: "与 AI：玫瑰的刺",
      preview: "刺是为了防身，还是为了让风记住香？我们把两种可能都留在文本边缘。",
    },
  },
  {
    id: "mn-16",
    paragraphId: "p-c2-4",
    chapterIndex: 1,
    type: "character",
    hoursAgo: 26,
    payload: {
      characterName: "玫瑰",
      title: "骄傲的褶皱",
      preview: "她骄傲、任性、带刺——驯养把平凡浇灌成不可替代。",
    },
  },
  {
    id: "mn-17",
    paragraphId: "p-c2-3",
    chapterIndex: 1,
    type: "bookmark",
    hoursAgo: 28,
    payload: {
      title: "火山 Routine",
      preview: "活火山每天早晨疏通；死火山也疏通——「谁也说不准」。",
    },
  },
  {
    id: "mn-18",
    paragraphId: "p-c2-2",
    chapterIndex: 1,
    type: "image",
    hoursAgo: 32,
    payload: {
      title: "盒子里的绵羊",
      preview: "有时「看见」交给信任，不交给眼睛。",
      imageUrl: "",
    },
  },
  {
    id: "mn-19",
    paragraphId: "p-c2-1",
    chapterIndex: 1,
    type: "dialogue",
    hoursAgo: 36,
    payload: {
      title: "与 AI：画的密码",
      preview: "他重复「给我画一只绵羊」——你把它当作门铃，还是当作求救？",
    },
  },
  {
    id: "mn-20",
    paragraphId: "p-c1-10",
    chapterIndex: 0,
    type: "dialogue",
    hoursAgo: 40,
    payload: {
      title: "与 AI：故事从哪里开始",
      preview: "撒哈拉、迫降、轻轻的一声「绵羊」——叙事的真正的开始往往不是第一页，而是第一次愿意听。",
    },
  },
  {
    id: "mn-21",
    paragraphId: "p-c1-9",
    chapterIndex: 0,
    type: "character",
    hoursAgo: 42,
    payload: {
      characterName: "叙述者「我」",
      title: "星空与纸笔",
      preview: "把纸笔藏进旅途的夜里——宇宙里有一颗小行星，上面住着把星星当笑声的孩子。",
    },
  },
  {
    id: "mn-22",
    paragraphId: "p-c1-8",
    chapterIndex: 0,
    type: "bgm",
    hoursAgo: 45,
    payload: {
      title: "氛围：机舱低频",
      preview: "白噪声 + 极弱螺旋桨（Mock），适合飞行员独白。",
    },
  },
  {
    id: "mn-23",
    paragraphId: "p-c1-7",
    chapterIndex: 0,
    type: "pending",
    hoursAgo: 48,
    payload: {
      title: "悬念",
      pendingQuestion: "为什么大人们总说「帽子」而不愿意看见蛇与大象？",
      pendingStatus: "waiting",
      preview: "队列中，第 3 章节点后揭晓。",
    },
  },
  {
    id: "mn-24",
    paragraphId: "p-c1-6",
    chapterIndex: 0,
    type: "bookmark",
    hoursAgo: 52,
    payload: {
      title: "摘录 · 迁就解释",
      preview: "大人们总要解释，孩子只好迁就——累的不是画，是对话的落差。",
    },
  },
  {
    id: "mn-25",
    paragraphId: "p-c1-5",
    chapterIndex: 0,
    type: "image",
    hoursAgo: 56,
    payload: {
      title: "第二号作品",
      preview: "剖开肚皮的蟒蛇，为了让「看懂」牺牲掉一点吓人。",
      imageUrl: "",
    },
  },
  {
    id: "mn-26",
    paragraphId: "p-c1-4",
    chapterIndex: 0,
    type: "dialogue",
    hoursAgo: 60,
    payload: {
      title: "与 AI：害怕与误解",
      preview: "你问帽子与蛇——我说误会有时不是视力问题，是耐心赤字。",
    },
  },
  {
    id: "mn-27",
    paragraphId: "p-c1-3",
    chapterIndex: 0,
    type: "character",
    hoursAgo: 64,
    payload: {
      characterName: "蟒蛇（意象）",
      title: "吞食与消化",
      preview: "一整夜消化——童年对「时间尺度」的直觉比历法诚实。",
    },
  },
  {
    id: "mn-28",
    paragraphId: "p-c1-2",
    chapterIndex: 0,
    type: "bookmark",
    hoursAgo: 68,
    payload: {
      title: "插图注记",
      preview: "那条蟒蛇的画，是你第一次想对世界宣布：我害怕，但我愿意想。",
    },
  },
];

import { getAiMapNodes } from "@/app/lib/ai/mapNodes";
import { LITTLE_PRINCE_BOOK_ID } from "@/app/lib/ai/data/littlePrince";
import type { ChatMessage, PendingQuestion } from "@/app/lib/mock/chat";

/**
 * 历史保留的多模态种子节点（image / bgm）。
 * Step 5 起，character / dialogue / pending / bookmark 由 ai/mapNodes.ts 派生；
 * image / bgm 仍由这里透传，归成员 3 维护。
 */
function multimodalRawNodes(): MapNode[] {
  return RAW_NODES.filter((r) => r.type === "image" || r.type === "bgm").map(
    (r) => {
      const { hoursAgo, ...rest } = r;
      return { ...rest, timestamp: ago(hoursAgo) };
    },
  );
}

export interface GetMapNodesOptions {
  chatMessages?: ChatMessage[];
  pendingQuestions?: PendingQuestion[];
  runtimeBookmarks?: BookmarkEntry[];
  demoNow?: Date;
}

export function getMapNodesForBook(
  bookId: string,
  opts: GetMapNodesOptions = {},
): MapNode[] {
  const isLittlePrince = bookId === LITTLE_PRINCE_BOOK_ID;
  return getAiMapNodes(bookId, {
    passthroughMultimodalNodes: isLittlePrince ? multimodalRawNodes() : [],
    chatMessages: opts.chatMessages,
    pendingQuestions: opts.pendingQuestions,
    runtimeBookmarks: opts.runtimeBookmarks,
    demoNow: opts.demoNow ?? MAP_DEMO_NOW,
  });
}

export type MapFilterTab =
  | "all"
  | "dialogue"
  | "image"
  | "character"
  | "pending"
  | "bookmark";

export function mapTabMatchesNode(tab: MapFilterTab, node: MapNode): boolean {
  if (node.type === "chapter" || node.type === "current") return tab === "all";
  if (tab === "all") return true;
  return node.type === tab;
}

/** 用于底部统计条（基于 mock 全量，不随筛选变化） */
export function getLittlePrinceMapStats(base: MapNode[]) {
  return {
    dialogue: base.filter((n) => n.type === "dialogue").length,
    image: base.filter((n) => n.type === "image").length,
    character: base.filter((n) => n.type === "character").length,
    pendingWaiting: base.filter(
      (n) => n.type === "pending" && n.payload.pendingStatus === "waiting",
    ).length,
  };
}
