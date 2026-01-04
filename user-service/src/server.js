import "dotenv/config";
import { connectDB, getDBStatus, logger } from "devdad-express-utils";
import { app } from "./app.js";
import { initializeRabbitMQ, consumeEvent } from "./utils/rabbitmq.utils.js";
import { setupAutomaticCleanup } from "./utils/registrationCleanup.utils.js";
import { handlePostCreatedEvent } from "./eventHandlers/userProfile.eventHandler.js";

await connectDB();

(async () => {
  try {
    await initializeRabbitMQ();

    // Setup event consumers
    await consumeEvent("post.created", handlePostCreatedEvent);

    // Setup automatic registration session cleanup (every 30 minutes)
    const cleanupInterval = setupAutomaticCleanup(30);
    logger.info("Registration cleanup service started");

    app.listen(process.env.PORT || 3001, () => {
      logger.info(
        `User Service is running on port ${process.env.PORT || 3001}`,
      );
      logger.info("User Service DB Status ->", getDBStatus());
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        logger.info('Registration cleanup stopped');
      }
      process.exit(0);
    });

  } catch (error) {
    logger.error("Failed to connect to servers... ", { error });
    process.exit(1);
  }
})();

process.on("unhandledRejection", (reason, p) => {
  logger.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  process.exit(1);
});
