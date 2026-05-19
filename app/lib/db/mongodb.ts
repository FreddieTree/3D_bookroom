/**
 * Singleton Mongoose connector for Next.js App Router routes and scripts.
 *
 * Keeps exactly one pooled connection alive across Fast Refresh reloads using a
 * `globalThis` cache.
 */
import mongoose from "mongoose";

/** Resolve db name lazily—Next.js/tsx loaders may hydrate env after imports. */
function resolveDbName() {
  return process.env.MONGODB_DB?.trim().length ? process.env.MONGODB_DB!.trim() : "bookroom";
}

type MongooseCache = {
  conn: mongoose.Mongoose | null;
  promise: Promise<mongoose.Mongoose> | null;
};

const globalWithMongo = globalThis as typeof globalThis & {
  __bookroomMongo?: MongooseCache;
};

function getCache(): MongooseCache {
  if (!globalWithMongo.__bookroomMongo) {
    globalWithMongo.__bookroomMongo = { conn: null, promise: null };
  }
  return globalWithMongo.__bookroomMongo;
}


/**
 * Connect to MongoDB (Atlas or self-hosted).
 *
 * @throws If `MONGODB_URI` is missing or handshake fails (caller should translate to HTTP 500).
 */
export async function connectDB(): Promise<mongoose.Mongoose> {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    const msg = "MONGODB_URI is missing; configure it in `.env.local`.";
    console.error("[Bookroom/db]", msg);
    throw new Error(msg);
  }

  const dbName = resolveDbName();
  const cached = getCache();

  if (cached.conn?.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    console.info("[Bookroom/db] establishing connection…", { dbName });
    cached.promise = mongoose.connect(uri, {
      dbName,
      maxPoolSize: 12,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cached.conn = await cached.promise;
    console.info("[Bookroom/db] ready", cached.conn.connection.readyState === 1);
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    console.error("[Bookroom/db] connection error:", err);
    throw err;
  }
}
