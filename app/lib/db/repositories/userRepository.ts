/** Lightweight user accessors for scaffolding auth later. */

import { User } from "@/app/lib/db/models/users";

export async function getUserById(userId: string) {
  return User.findOne({ userId }).lean().exec();
}
