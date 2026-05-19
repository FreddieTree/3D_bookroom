/** Gallery lookups for multimodal previews. */

import { GeneratedContent } from "@/app/lib/db/models/generatedContents";

export async function listGeneratedForUser(userId: string, limit = 60) {
  return GeneratedContent.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();
}
