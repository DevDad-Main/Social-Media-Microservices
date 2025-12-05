import "dotenv/config";
import { connectDB, getDBStatus, logger } from "devdad-express-utils";
import { app } from "./app.js";
import { consumeEvent, initializeRabbitMQ } from "./utils/rabbitmq.utils.js";
import { handleDeletedPostEvent } from "./eventHandlers/media.eventHandler.js";

await connectDB();

(async () => {
  try {
    await initializeRabbitMQ();

    await consumeEvent("post.deleted", handleDeletedPostEvent);

    app.listen(process.env.PORT || 3003, () => {
      logger.info(
        `Media Service is running on port ${process.env.PORT || 3003}`,
      );
      logger.info("Media Service DB Status ->", getDBStatus());
    });
  } catch (error) {
    logger.error("Failed to connect to servers... ", error);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (reason, p) => {
  logger.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  process.exit(1);
});
