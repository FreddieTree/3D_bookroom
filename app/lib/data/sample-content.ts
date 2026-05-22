export interface Paragraph {
  id: string;
  text: string;
  chapterId: string;
}

export interface ChapterContent {
  bookId: string;
  index: number;
  title: string;
  paragraphs: Paragraph[];
  /** Mongo 分型（样例/mock 可无）。 */
  chapterType?: "frontmatter" | "body" | "backmatter";
  bodyIndex?: number | null;
}

/** 公版情节梗概式中文段落，便于离线演示排版与交互（非逐字转载任一译本）。 */
const LITTLE_PRINCE_C1: Paragraph[] = [
  {
    id: "p-c1-1",
    chapterId: "c1",
    text: "我还记得，六岁那年，我在一本描写原始森林的名叫《真实的故事》的书中，看到过一幅精彩的插图。画的是一条蟒蛇正在吞食一只大野兽。",
  },
  {
    id: "p-c1-2",
    chapterId: "c1",
    text: "下面便是那幅画的摹本。书中写道：“蟒蛇把猎物整个囫囵吞下去，并不咀嚼，然后就不能再动了，一整夜都在消化。”",
  },
  {
    id: "p-c1-3",
    chapterId: "c1",
    text: "我当时对着这幅画想了很久，觉得森林里一定有许多惊险的故事。大人的世界常常把“有用”看得比什么都重，却把想象力轻轻放在一旁。",
  },
  {
    id: "p-c1-4",
    chapterId: "c1",
    text: "于是我也画了我的第一号作品：一条蟒蛇吞了一头大象。我把我的杰作拿给大人们看，问他们：我的画是不是叫他们害怕？",
  },
  {
    id: "p-c1-5",
    chapterId: "c1",
    text: "他们回答我说：“一顶帽子有什么可怕的？”我画的不是帽子，而是一条蟒蛇消化着一头大象。我只好把蟒蛇肚子里面的大象也画了出来，好叫大人们看懂。",
  },
  {
    id: "p-c1-6",
    chapterId: "c1",
    text: "这些大人们，就总要别人做这样那样的解释。我呢，只好迁就他们，把第一号作品改成第二号作品：大人们劝我把剖开或闭上肚皮的蟒蛇搁在一边，还是把心思放到地理、历史、算术与文法上去。",
  },
  {
    id: "p-c1-7",
    chapterId: "c1",
    text: "就这样，我在六岁那年，只好放弃了当画家的光荣事业。第一号、第二号作品的不成功，使我泄了气。大人们自己什么也不懂，却要人处处体谅他们，真有些叫人累。",
  },
  {
    id: "p-c1-8",
    chapterId: "c1",
    text: "后来我只好另选了一个职业，学会了驾驶飞机。我在世界各地旅行，确实也遇见不少严肃认真的人。于是我在大人们中间生活了许久，并且就近观察他们。",
  },
  {
    id: "p-c1-9",
    chapterId: "c1",
    text: "我并没有真的放弃画画，只是把纸笔藏进旅途的夜里。星空像一盘细细的白盐，撒在云层之上；我知道，宇宙里有一颗小行星，上面住着一个能把星星当作笑声的孩子。",
  },
  {
    id: "p-c1-10",
    chapterId: "c1",
    text: "直到有一天，我在撒哈拉沙漠里被迫降落，认识了那个小人儿——故事才真正开始。请允许我从那声轻轻的“请你……给我画一只绵羊”说起。",
  },
];

const LITTLE_PRINCE_C2: Paragraph[] = [
  {
    id: "p-c2-1",
    chapterId: "c2",
    text: "第一个夜里，我听见他再三重复那句话，仿佛那是一句密码，或者一枚贴在心底的邮票。我递给他纸和笔，他却不满意，接连否了我的好几张画。",
  },
  {
    id: "p-c2-2",
    chapterId: "c2",
    text: "最后我不得不画一个盒子，对他说绵羊就在里面。他笑了，那笑容很轻，像晨风吹开一层薄雾：有时我们把“看见”交给信任，而不是交给眼睛。",
  },
  {
    id: "p-c2-3",
    chapterId: "c2",
    text: "他来自一颗小行星，小得只比他自己略大一点。星球上有一座活火山，他每天早晨疏通它；还有一座死火山，他也照样疏通，因为“谁也说不准”。",
  },
  {
    id: "p-c2-4",
    chapterId: "c2",
    text: "他提起他的玫瑰时，语气又骄傲又不安——骄傲于她的独特，不安于她的带刺与任性。驯养，本就是把时间浇灌在同一件事上，让平凡变得不可替代。",
  },
  {
    id: "p-c2-5",
    chapterId: "c2",
    text: "我问他：玫瑰的刺是用来做什么的？他沉默了一会儿，说也许是为了保护自己，也许只是为了让风记得她的香气更晚一点散去。",
  },
  {
    id: "p-c2-6",
    chapterId: "c2",
    text: "我们在沙丘上并肩走。夜色降下来，星星一颗接一颗亮起，他忽然问我：“大人真的爱一个人，还会数得清天上的灯吗？”",
  },
  {
    id: "p-c2-7",
    chapterId: "c2",
    text: "我说，有些人喜欢数，有些人宁愿只看一盏。他点点头，像是对答案满意，又像是对答案无所谓——重要的从来不是数量，而是你是否愿意为它负责。",
  },
  {
    id: "p-c2-8",
    chapterId: "c2",
    text: "他讲起猴面包树的危险：若不早早拔掉幼苗，根系会把整颗星球撑裂。许多问题也像这样，起初只是细小的疏忽，后来却长成无法回转的命运。",
  },
  {
    id: "p-c2-9",
    chapterId: "c2",
    text: "我问他会不会害怕孤独。他说：“当你抬头看星星时，你知道其中一颗上，有一朵花在等你回来——孤独就不那么锋利。”",
  },
  {
    id: "p-c2-10",
    chapterId: "c2",
    text: "那一夜，沙漠很冷，我们却坐在看不见的炉火旁。远处有狼一般的寂静。我渐渐明白：真正的温暖，往往不是温度，而是被理解的瞬间。",
  },
  {
    id: "p-c2-11",
    chapterId: "c2",
    text: "第二天清晨，他在沙地上画出他的星球，小得像一枚硬币。他说他要回去浇水了。我握着指南针的手心出汗，却知道他说的“回去”并不是地理意义上的方向。",
  },
];

const LITTLE_PRINCE_C3: Paragraph[] = [
  {
    id: "p-c3-1",
    chapterId: "c3",
    text: "我们遇见国王、虚荣者、酒鬼、商人、点灯人与地理学家。每个人都占有一颗自己的小行星，却把生活过成一台只为自己轰鸣的机器。",
  },
  {
    id: "p-c3-2",
    chapterId: "c3",
    text: "国王只喜欢下命令，却没有人可以命令；虚荣者只想被崇拜，却听不见一句真心话。那些冠冕与披风，在日光下显得又轻又旧。",
  },
  {
    id: "p-c3-3",
    chapterId: "c3",
    text: "酒鬼为羞愧而喝，又为喝酒而羞愧，循环像一把钝锯。小人儿说：“大人们真是奇怪。”我竟无法反驳。",
  },
  {
    id: "p-c3-4",
    chapterId: "c3",
    text: "商人把星星存进银行号码里，认真得仿佛星星是可以锁进抽屉的黄金。他问：“这有什么用？”商人答：“这可以让人变富。”——可富有之后呢？",
  },
  {
    id: "p-c3-5",
    chapterId: "c3",
    text: "点灯人每分钟点一次灯又熄一次灯，规矩比睡眠更重。他说：“这是命令。”我在他疲惫的眼睛里看见一种近乎温柔的尽职。",
  },
  {
    id: "p-c3-6",
    chapterId: "c3",
    text: "地理学家从不离开书桌，只记录探险家的回忆。他告诉小王子：玫瑰是短暂的事物。“短暂”二字落在心上，像一滴冷水。",
  },
  {
    id: "p-c3-7",
    chapterId: "c3",
    text: "我们来到地球。成千上万朵玫瑰在花园里摇摆，颜色像他家乡的那一朵，却又似乎都不是。那种失落，比迷路更深。",
  },
  {
    id: "p-c3-8",
    chapterId: "c3",
    text: "狐狸出现，讲起驯养：“仪式就是使某一天与其他日子不同，使某一刻与其他时刻不同。”那一瞬间，风像被谁轻轻按了暂停。",
  },
  {
    id: "p-c3-9",
    chapterId: "c3",
    text: "他说，你要对你驯养的对象负责。责任把自由系在一根柔韧的线上：既不是枷锁，也不是轻易能挣断的细丝。",
  },
  {
    id: "p-c3-10",
    chapterId: "c3",
    text: "当小王子再次仰望星空，他知道其中一颗上有他的玫瑰；当飞行员后来仰望星空，他知道其中一颗上有他的笑声。世界因此少了些空无，多了些回声。",
  },
  {
    id: "p-c3-11",
    chapterId: "c3",
    text: "这就是我们在沙漠里交换的秘密：眼睛看不见的，要用心去看。我把这句话写进水壶的盐边，留在旅人的唇上，留给下一个愿意慢下来阅读的夜晚。",
  },
];

const LITTLE_PRINCE_CHAPTERS: ChapterContent[] = [
  {
    bookId: "little-prince",
    index: 0,
    title: "第一章 · 当我还只有六岁的时候",
    paragraphs: LITTLE_PRINCE_C1,
  },
  {
    bookId: "little-prince",
    index: 1,
    title: "第二章 · 请给我画一只绵羊",
    paragraphs: LITTLE_PRINCE_C2,
  },
  {
    bookId: "little-prince",
    index: 2,
    title: "第三章 · 在星际之间",
    paragraphs: LITTLE_PRINCE_C3,
  },
];

export function getChaptersForBook(bookId: string): ChapterContent[] | null {
  if (bookId === "little-prince") return LITTLE_PRINCE_CHAPTERS;
  return null;
}

export function getTotalChapterCount(bookId: string): number {
  const ch = getChaptersForBook(bookId);
  return ch?.length ?? 0;
}

export function computeReadProgressPercentFromChapters(
  chs: ChapterContent[],
  progress:
    | { chapterIndex: number; paragraphId: string | null }
    | undefined
    | null,
): number {
  if (!chs.length || !progress) return 0;
  let total = 0;
  let read = 0;
  for (let i = 0; i < chs.length; i++) {
    const n = chs[i]!.paragraphs.length;
    total += n;
    if (i < progress.chapterIndex) read += n;
    else if (i === progress.chapterIndex) {
      const ix = chs[i]!.paragraphs.findIndex((p) => p.id === progress.paragraphId);
      read += ix >= 0 ? ix + 1 : 0;
    }
  }
  if (total === 0) return 0;
  return Math.min(100, Math.round((read / total) * 100));
}

/** @deprecated Prefer `computeReadProgressPercentFlexible` — 仅能统计有 `sample-content` 的书。 */
export function computeReadProgressPercent(
  bookId: string,
  progress: { chapterIndex: number; paragraphId: string | null } | undefined,
): number {
  const chs = getChaptersForBook(bookId);
  return computeReadProgressPercentFromChapters(chs ?? [], progress);
}
