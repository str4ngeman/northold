import mongoose from "mongoose";

import { seedDatabase } from "@/lib/seed";

const MONGODB_URI: string = process.env.MONGODB_URI ?? "";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set");
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
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cache.conn = await cache.promise;
  if (!cache.seeded) {
    await seedDatabase();
    cache.seeded = true;
  }
  return cache.conn;
}
