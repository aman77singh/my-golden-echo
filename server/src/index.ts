import http from "http";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./logger.js";
import { initSocketServer } from "./socket.js";

async function bootstrap() {
  try {
    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Create Express app
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.IO with JWT auth & room management
    initSocketServer(server);

    // 4. Start HTTP Server
    server.listen(env.PORT, () => {
      logger.info(
        `🌟 Our Space backend listening on port ${env.PORT} (${env.NODE_ENV})`
      );
    });

    // 5. Graceful shutdown
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info("Process terminated cleanly.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

bootstrap();
