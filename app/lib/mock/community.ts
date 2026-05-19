/**
 * 共读社区展示用 Mock（问题墙 / 共生成画廊），不接后端。
 */

export type CommunityQuestionPreview = {
  id: string;
  excerpt: string;
  bookHint: string;
};

export type CommunityImagePreview = {
  id: string;
  emoji: string;
  fromGradient: string;
  toGradient: string;
};

export const mockCommunityQuestions: CommunityQuestionPreview[] = [
  {
    id: "q1",
    excerpt: "玫瑰的刺，到底是在防备世界，还是在掩饰害怕被看穿？",
    bookHint: "《小王子》",
  },
  {
    id: "q2",
    excerpt: "狐狸说的「驯养」，和现代人说的「亲密关系」有什么不同？",
    bookHint: "《小王子》",
  },
  {
    id: "q3",
    excerpt: "蛇在故事里是死亡还是摆渡？为什么我读完背脊发凉……",
    bookHint: "《小王子》",
  },
  {
    id: "q4",
    excerpt: "如果箱子里的绵羊并不存在，小王子还算「诚实」吗？",
    bookHint: "《小王子》",
  },
  {
    id: "q5",
    excerpt: "B-612 小行星这么小，算不算一种「隐喻里的抑郁」？",
    bookHint: "《小王子》",
  },
  {
    id: "q6",
    excerpt: "老人为什么要跟鱼说话？他是不是在自言自语地抵抗遗忘？",
    bookHint: "《老人与海》",
  },
  {
    id: "q7",
    excerpt: "\"Big Brother\" 的恐惧，在今天的算法推荐里还能看到影子吗？",
    bookHint: "《1984》",
  },
  {
    id: "q8",
    excerpt: "小王子的落日看了四十四次——这是浪漫，还是重复的悲伤？",
    bookHint: "《小王子》",
  },
  {
    id: "q9",
    excerpt: "如果记忆可以被篡改，还有什么是「我的经验」？",
    bookHint: "《1984》",
  },
  {
    id: "q10",
    excerpt: "「人只能被毁灭，不能被打败」算不算一种自我感动的危险？",
    bookHint: "《老人与海》",
  },
];

export const mockCommunityImages: CommunityImagePreview[] = [
  { id: "i1", emoji: "🌹", fromGradient: "#6b2144", toGradient: "#c9a24d" },
  { id: "i2", emoji: "🦊", fromGradient: "#2d3f2f", toGradient: "#8b7355" },
  { id: "i3", emoji: "🐑", fromGradient: "#3a3f55", toGradient: "#9aa3c9" },
  { id: "i4", emoji: "🪐", fromGradient: "#1a2740", toGradient: "#4a7ab8" },
  { id: "i5", emoji: "🌅", fromGradient: "#4a3728", toGradient: "#d4a574" },
  { id: "i6", emoji: "🐍", fromGradient: "#1e2b24", toGradient: "#5c8f6f" },
  { id: "i7", emoji: "✨", fromGradient: "#2b2240", toGradient: "#b8a9e8" },
  { id: "i8", emoji: "🌊", fromGradient: "#1c3d50", toGradient: "#87b9d4" },
  { id: "i9", emoji: "⛵", fromGradient: "#3a3528", toGradient: "#a89c74" },
  { id: "i10", emoji: "🌙", fromGradient: "#1e2238", toGradient: "#6b7394" },
  { id: "i11", emoji: "🎩", fromGradient: "#362a38", toGradient: "#8b7289" },
  { id: "i12", emoji: "🌌", fromGradient: "#0f1420", toGradient: "#3d4870" },
];
