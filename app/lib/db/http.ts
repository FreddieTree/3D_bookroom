/** JSON helpers reused by Atlas-backed route handlers. */
import { NextResponse } from "next/server";

/** Shape returned when Mongo handshake / query fails unexpectedly. */
export function databaseErrorResponse(reason: unknown) {
  const message =
    reason instanceof Error
      ? reason.message
      : "数据库暂时不可用，请稍后重试或检查 Atlas 配额 / 凭据是否正确。";

  console.error("[api/db]", reason);

  return NextResponse.json(
    {
      error: "DATABASE_UNAVAILABLE",
      message,
    },
    { status: 500 },
  );
}
