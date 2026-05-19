/** Telemetry + billing ingestion helpers. */

import { UsageLog } from "@/app/lib/db/models/usageLogs";

export async function aggregateUsageLogs(userId: string, horizonDays = 7) {
  const since = new Date();
  since.setDate(since.getDate() - horizonDays);

  const rows = await UsageLog.find({
    userId,
    recordedAt: { $gte: since },
  }).lean();

  const totals = rows.reduce(
    (acc, row) => {
      acc.prompt += row.tokenIn ?? 0;
      acc.completion += row.tokenOut ?? 0;
      return acc;
    },
    { prompt: 0, completion: 0 },
  );

  return {
    totals,
    horizonDays,
    samples: rows.slice(Math.max(rows.length - 25, 0)),
  };
}
