import mongoose from "mongoose";

import { seedDatabase } from "@/lib/seed";

function mongoUri() {
  const uri = process.env.MONGODB_URI ?? "";
  if (!uri) throw new Error("MONGODB_URI is not set");
  return uri;
}

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  seeded: boolean;
};

const globalForMongoose = globalThis as typeof globalThis & { mongooseCache?: Cache };

const cache: Cache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
  seeded: false,
};
globalForMongoose.mongooseCache = cache;

export async function connectDb() {
  if (cache.conn) {
    if (!cache.seeded) {
      await seedDatabase();
      cache.seeded = true;
    }
    return cache.conn;
  }
  if (!cache.promise) {
    cache.promise = mongoose.connect(mongoUri(), { bufferCommands: false });
  }
  cache.conn = await cache.promise;
  if (!cache.seeded) {
    await seedDatabase();
    cache.seeded = true;
  }
  return cache.conn;
}
