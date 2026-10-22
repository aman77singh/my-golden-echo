import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../logger.js";

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      autoIndex: true,
    });
    logger.info({ host: conn.connection.host, name: conn.connection.name }, "MongoDB connected successfully");
    return conn;
  } catch (error) {
    if (env.NODE_ENV === "development") {
      logger.warn(`Local MongoDB not reachable at ${uri}. Starting in-memory MongoDB for local dev...`);
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      const conn = await mongoose.connect(memUri, { autoIndex: true });
      logger.info({ uri: memUri }, "In-memory MongoDB connected successfully");

      const { seedCouple } = await import("../services/seedService.js");
      await seedCouple();
      logger.info("Dev couple seeded successfully into in-memory MongoDB");
      return conn;
    }
    logger.error({ err: error }, "Failed to connect to MongoDB");
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
