/** 相对过去时间（中文），用于时间轴。 */
export function formatRelativeTimePast(
  date: Date,
  now: Date = new Date(),
): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "刚刚";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "刚刚";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}
