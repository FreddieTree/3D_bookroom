/**
 * Canonical bootstrap script for teammate onboarding + Atlas sanity checks.
 *
 * Run locally with `npm run db:seed` after `.env.local` contains Atlas creds.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "@/app/lib/db/mongodb";

import {
  ingestCatalogSeed,
  seedDemoUserLayer,
  wipeSeedScope,
} from "@/app/lib/db/seed/catalog-seed";

const envLocalPath = path.resolve(process.cwd(), ".env.local");

if (!process.env.MONGODB_URI?.trim()) {
  if (existsSync(envLocalPath)) {
    loadDotenv({ path: envLocalPath, override: true });
    console.info("[seed] loaded environment from .env.local");
  } else {
    loadDotenv();
  }
}

async function seed() {
  await connectDB();
  console.info("[seed] wiping previous demo scope books + demo persona…");
  await wipeSeedScope();
  await ingestCatalogSeed();
  await seedDemoUserLayer();
  console.info("[seed] complete — catalogue + persona inserted.");
}

seed()
  .catch((error) => {
    console.error("[seed] aborted:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
    console.info("[seed] mongoose connection closed");
  });
