/** Lightweight community carousel queries. */

import { CommunityShare } from "@/app/lib/db/models/communityShares";

export async function listFeaturedShares(limit = 30) {
  return CommunityShare.find({ visibility: "public", isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();
}

export async function listPublicShares(limit = 50) {
  return CommunityShare.find({ visibility: "public" })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()
    .exec();
}
