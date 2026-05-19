/**
 * 演示账号 / 订阅 / Token（不接支付与后端）。
 * TODO: 成员对接计费后替换为 API。
 */

export type SubscriptionTierId = "free" | "reader" | "pro";

export type MockUserProfile = {
  nickname: string;
  avatarEmoji: string;
  /** 展示用文案，如 Reader 会员 */
  membershipLine: string;
  tier: SubscriptionTierId;
};

export type MockTokenUsage = {
  monthlyCap: number;
  monthlyUsed: number;
  chats: number;
  images: number;
  music: number;
  videos: number;
  resetInDays: number;
};

export const DEFAULT_MOCK_USER: MockUserProfile = {
  nickname: "读者",
  avatarEmoji: "📚",
  membershipLine: "三维书屋会员 · Free",
  /** 订阅卡片展示为 Free（当前），与个人区礼遇文案分离（演示） */
  tier: "free",
};

export const DEFAULT_MOCK_TOKEN: MockTokenUsage = {
  monthlyCap: 2_000,
  monthlyUsed: 1_180,
  chats: 86,
  images: 24,
  music: 6,
  videos: 2,
  resetInDays: 5,
};

export type SubscriptionPlanCard = {
  id: SubscriptionTierId;
  name: string;
  priceLine: string;
  quotaLine: string;
  perks: string[];
};

export const SUBSCRIPTION_PLANS: SubscriptionPlanCard[] = [
  {
    id: "free",
    name: "Free",
    priceLine: "¥0 / 月",
    quotaLine: "每月 2,000 点 · 基础模型",
    perks: ["每日话题卡 1 张", "本地阅读全功能", "地图时间轴预览"],
  },
  {
    id: "reader",
    name: "Reader",
    priceLine: "¥28 / 月",
    quotaLine: "每月 8,000 点 · 优先队列",
    perks: ["多模态生成优先生成", "章节封面 BGM 扩展包", "云同步书架（Mock）"],
  },
  {
    id: "pro",
    name: "Pro",
    priceLine: "¥68 / 月",
    quotaLine: "每月 24,000 点 · 旗舰模型",
    perks: ["家庭共享 3 席位", "导出精读报告 PDF", "视频摘要（限量）"],
  },
];
