import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Missing MONGODB_URI env var. Set it to your Atlas connection string, e.g. " +
      "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/lokalads?retryWrites=true&w=majority"
  );
}

/**
 * Next.js hot-reloads modules in dev, which would otherwise create a new
 * mongoose connection on every request. Cache the connection promise on the
 * global object so it survives reloads.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string, {
      // Atlas-recommended options; tune per cluster tier
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;